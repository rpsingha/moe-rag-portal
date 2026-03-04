import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

// ============= DATABASE CONNECTION =============
let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(process.env.DB_NAME || 'moe_rag_portal');
  return cachedDb;
}

// ============= LLM SETUP via Google Gemini API =============
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
}

async function generateLLMResponse(messages) {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: messages,
    max_tokens: 4096,
    temperature: 0.3,
  });
  return response.choices[0].message.content;
}

// ============= TF-IDF SEARCH ENGINE (No API needed) =============
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function computeTFIDF(documents) {
  const N = documents.length;
  const df = {};

  // Document frequency
  documents.forEach(doc => {
    const seen = new Set();
    tokenize(doc.text).forEach(word => {
      if (!seen.has(word)) {
        df[word] = (df[word] || 0) + 1;
        seen.add(word);
      }
    });
  });

  // IDF
  const idf = {};
  Object.keys(df).forEach(word => {
    idf[word] = Math.log(N / (df[word] + 1)) + 1;
  });

  return idf;
}

function tfidfVector(text, idf) {
  const tokens = tokenize(text);
  const tf = {};
  tokens.forEach(word => { tf[word] = (tf[word] || 0) + 1; });

  const vec = {};
  Object.keys(tf).forEach(word => {
    vec[word] = (tf[word] / tokens.length) * (idf[word] || 1);
  });
  return vec;
}

function cosineSimilarityVec(v1, v2) {
  const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let dot = 0, n1 = 0, n2 = 0;
  allKeys.forEach(key => {
    const a = v1[key] || 0;
    const b = v2[key] || 0;
    dot += a * b;
    n1 += a * a;
    n2 += b * b;
  });
  return dot / (Math.sqrt(n1) * Math.sqrt(n2) || 1);
}

async function searchChunks(db, query, topK = 5, category = null) {
  let chunks = await db.collection('chunks').find({}).toArray();

  if (category) {
    chunks = chunks.filter(c => c.category === category);
  }

  if (chunks.length === 0) return [];

  const idf = computeTFIDF(chunks);
  const queryVec = tfidfVector(query, idf);

  const scored = chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarityVec(queryVec, tfidfVector(chunk.text, idf))
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter(c => c.score > 0.05);
}

// ============= TEXT CHUNKING =============
function chunkText(text, chunkSize = 200, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

// ============= SAMPLE POLICY DATA =============
const SAMPLE_POLICIES = [
  {
    id: uuidv4(),
    title: 'National Education Policy 2020 - Multidisciplinary Education',
    category: 'NEP 2020',
    year: 2020,
    source: 'Ministry of Education, Government of India',
    sourceDocument: 'NEP 2020 Full Document',
    clause: 'Chapter 11, Section 11.1-11.8',
    content: `The National Education Policy 2020 envisions a complete overhaul of the higher education system in India. Key provisions include: (1) All higher education institutions shall aim to become multidisciplinary by 2040. Large multidisciplinary universities and HEI clusters/Knowledge Hubs shall be established across the country. (2) The policy introduces a flexible 4-year undergraduate programme with multiple exit options: Certificate after 1 year, Diploma after 2 years, Bachelor's Degree after 3 years, and Bachelor's with Research after 4 years. (3) Academic Bank of Credits (ABC) will be established to facilitate credit transfer and allow students to curate their own paths of learning. (4) The National Research Foundation (NRF) will be established with an annual funding of Rs 20,000 crore to catalyse research and innovation across all disciplines. (5) Holistic and Multidisciplinary Education aims to develop all capacities of human beings - intellectual, aesthetic, social, physical, emotional, and moral. (6) The Gross Enrolment Ratio in higher education to be increased from 26.3% to 50% by 2035. (7) All HEIs shall offer programmes in Indian languages and bilingual education.`,
    timeline: [
      { year: 1986, event: 'NPE 1986 introduced general higher education reforms', detail: 'National Policy on Education 1986 focused on modernization and consolidation of higher education.' },
      { year: 1992, event: 'Programme of Action 1992 revised NPE', detail: 'Revised action plan emphasizing access, quality and relevance in higher education.' },
      { year: 2009, event: 'Yashpal Committee recommended university reforms', detail: 'Committee recommended overhaul of higher education regulatory system.' },
      { year: 2020, event: 'NEP 2020 approved by Union Cabinet', detail: 'Comprehensive policy replacing NPE 1986, introducing multidisciplinary education, 4-year UG, ABC, and NRF.' },
      { year: 2023, event: 'UGC Draft Regulations for NEP Implementation', detail: 'UGC released comprehensive regulations for implementing NEP 2020 in universities.' }
    ]
  },
  {
    id: uuidv4(),
    title: 'Academic Bank of Credits (ABC) Framework',
    category: 'NEP 2020',
    year: 2021,
    source: 'University Grants Commission',
    sourceDocument: 'UGC ABC Regulations 2021',
    clause: 'Regulation 4.1-4.15',
    content: `The Academic Bank of Credits (ABC) is a national-level facility that functions as a digital repository for academic credits earned by students. Key features: (1) ABC will digitally store the academic credits earned from recognized HEIs and allows students to open their academic account. (2) Students can accumulate credits from multiple institutions and redeem them for a degree/diploma/certificate. (3) Credits earned have a shelf life of 7 years from the date of earning. (4) ABC operates on the principle of 'Anytime, Anywhere, Any Level' learning. (5) Minimum 50% credits must be earned from the degree-granting institution. (6) The credit framework follows National Higher Education Qualification Framework (NHEQF) with 1 credit = 30 notional hours of learning. (7) All recognized HEIs must register on the ABC portal and upload student credit data. (8) Inter-institutional credit transfer is facilitated through ABC. The system currently has over 2,000 registered institutions and 5 crore student accounts.`,
    timeline: [
      { year: 2020, event: 'NEP 2020 proposed ABC concept', detail: 'Academic Bank of Credits conceptualized in NEP 2020.' },
      { year: 2021, event: 'UGC established ABC', detail: 'ABC portal launched by UGC, regulations notified.' },
      { year: 2022, event: 'Over 1000 HEIs registered', detail: 'Rapid adoption by universities and colleges.' },
      { year: 2023, event: 'ABC made mandatory for all HEIs', detail: 'All recognized institutions required to register.' },
      { year: 2024, event: '5 crore student accounts opened', detail: 'Major milestone in student enrollment on ABC portal.' }
    ]
  },
  {
    id: uuidv4(),
    title: 'UGC Regulations on Graded Autonomy',
    category: 'UGC Regulations',
    year: 2023,
    source: 'University Grants Commission',
    sourceDocument: 'UGC Graded Autonomy Regulations 2023',
    clause: 'Chapter III, Sections 8-15',
    content: `The UGC Graded Autonomy framework provides institutions with autonomy based on their NAAC accreditation grade and NIRF ranking. Key provisions: (1) Category I Institutions (NAAC A++ or top 100 NIRF): Full academic and administrative autonomy, can start new programmes without UGC approval, set their own fee structure, enter international collaborations, establish off-campus centres. (2) Category II Institutions (NAAC A+ or top 500 NIRF): Substantial autonomy with some regulatory oversight, can start UG programmes without approval. (3) Category III Institutions (NAAC A or accredited): Limited autonomy with regular monitoring. (4) Institutions must undergo NAAC accreditation every 5 years. (5) Autonomous colleges can design their own syllabus, conduct examinations, and award degrees. (6) The Graded Autonomy framework aims to reduce regulatory burden while maintaining quality standards. (7) Institutions with poor NAAC scores may face restrictions and mandatory improvement plans.`,
    timeline: [
      { year: 1986, event: 'NPE 1986 proposed autonomous colleges', detail: 'First formal policy push for college autonomy.' },
      { year: 2003, event: 'UGC Guidelines on Autonomous Colleges', detail: 'Detailed guidelines for granting and maintaining autonomous status.' },
      { year: 2018, event: 'UGC Graded Autonomy introduced', detail: 'NAAC-linked graded autonomy framework launched.' },
      { year: 2020, event: 'NEP 2020 emphasized institutional autonomy', detail: 'NEP proposed all HEIs to become autonomous by 2035.' },
      { year: 2023, event: 'Revised Graded Autonomy Regulations', detail: 'Enhanced framework with more categories and clearer criteria.' }
    ]
  },
  {
    id: uuidv4(),
    title: 'AICTE Approval Process Handbook 2024-25',
    category: 'AICTE Guidelines',
    year: 2024,
    source: 'All India Council for Technical Education',
    sourceDocument: 'AICTE APH 2024-25',
    clause: 'Sections 2.1-2.8, Annexure I-IV',
    content: `The AICTE Approval Process Handbook (APH) outlines the comprehensive procedure for establishing and operating technical institutions in India. Key provisions: (1) Any new technical institution must obtain AICTE approval before admitting students. (2) Approval is required for programmes in Engineering, Management, Pharmacy, Architecture, Hotel Management, and Applied Arts. (3) Institutions must have minimum 2.5 acres of land (5 acres for engineering) with clear title. (4) Faculty-to-student ratio must be maintained at 1:15 for UG and 1:12 for PG programmes. (5) Minimum 80% of faculty must have PhD qualifications for PG programmes. (6) Institutions must comply with mandatory disclosure requirements on the AICTE portal. (7) AICTE conducts online and physical inspections annually. (8) New institutions require State Government NOC, land documents, infrastructure proof, and faculty appointment letters. (9) Extension of Approval (EOA) is required annually for existing institutions. (10) AICTE has introduced online single-window approval process to reduce paperwork.`,
    timeline: [
      { year: 1987, event: 'AICTE Act enacted', detail: 'AICTE established as statutory body for technical education.' },
      { year: 2000, event: 'First comprehensive APH released', detail: 'Standardized approval process handbook introduced.' },
      { year: 2012, event: 'Online approval process started', detail: 'Transition to digital approval applications.' },
      { year: 2020, event: 'NEP 2020 proposed AICTE reform', detail: 'NEP recommended light-touch regulation by AICTE.' },
      { year: 2024, event: 'Simplified APH 2024-25', detail: 'Further streamlined process with reduced documentation.' }
    ]
  },
  {
    id: uuidv4(),
    title: 'Rashtriya Uchchatar Shiksha Abhiyan (RUSA) 2.0',
    category: 'Central Schemes',
    year: 2022,
    source: 'Ministry of Education, Department of Higher Education',
    sourceDocument: 'RUSA 2.0 Guidelines',
    clause: 'Scheme Guidelines, Chapters 1-6',
    content: `RUSA (Rashtriya Uchchatar Shiksha Abhiyan) is a centrally sponsored scheme for funding state higher education institutions. RUSA 2.0 key components: (1) Infrastructure Grants: Up to Rs 100 crore per university for new buildings, labs, libraries, and digital infrastructure. (2) Equity Initiatives: Special funding for institutions in aspirational districts, SC/ST/minority concentrated areas. (3) Faculty Improvement: Research grants of Rs 50 lakh per faculty member for doctoral research. (4) Quality Mandate: All funded institutions must achieve NAAC accreditation within 3 years. (5) State Higher Education Plans (SHEPs) must be prepared by each state. (6) Funding pattern: 60:40 (Centre:State) for general states, 90:10 for special category states. (7) Model Degree Colleges: Rs 12 crore per college in educationally backward districts. (8) New Professional Colleges: Rs 50 crore each for new engineering/medical colleges in underserved areas. (9) Digital infrastructure: Smart classrooms, virtual labs, and campus-wide WiFi mandatory. Eligibility: State universities, government and government-aided colleges, model degree colleges. Total allocation: Rs 12,929 crore for 2021-26 period.`,
    eligibility: {
      institutionType: ['State University', 'Government College', 'Government-Aided College'],
      requirements: ['NAAC accreditation or willingness to get accredited within 3 years', 'State Higher Education Plan (SHEP) approved', 'State contribution share committed', 'Compliance with reservation policies'],
      fundingRange: 'Rs 12 crore - Rs 100 crore depending on component'
    }
  },
  {
    id: uuidv4(),
    title: 'PM-USHA (Pradhan Mantri Uchchatar Shiksha Abhiyan)',
    category: 'Central Schemes',
    year: 2023,
    source: 'Ministry of Education, Department of Higher Education',
    sourceDocument: 'PM-USHA Scheme Document 2023',
    clause: 'Scheme Guidelines, Sections 1-10',
    content: `PM-USHA is the enhanced version of RUSA, aligned with NEP 2020 goals. Key provisions: (1) Multidisciplinary Education Support: Rs 100 crore per state university for transformation into multidisciplinary institution. (2) Model Multidisciplinary Colleges: Rs 35 crore per college for establishing new model colleges. (3) Skill Development Integration: Mandatory integration of skill courses and vocational training. (4) Gender Inclusion Fund: Dedicated allocation for women's education in STEM. (5) Research & Innovation: Rs 10 crore per institution for establishing research cells and innovation hubs. (6) Digital Infrastructure: Smart classrooms, AI labs, virtual reality labs. (7) Faculty Development: International exposure programmes and research sabbaticals. (8) NEP Implementation Support: Direct support for 4-year UG programme implementation, ABC integration, multiple entry/exit. (9) Indian Knowledge Systems: Funding for IKS centres and courses. (10) Total outlay: Rs 12,926.10 crore for 2023-26. Eligibility: State/UT government and government-aided institutions willing to transform as per NEP 2020.`,
    eligibility: {
      institutionType: ['State University', 'Government College', 'Government-Aided College'],
      requirements: ['Willingness to transform into multidisciplinary institution', 'NAAC accreditation (or commitment)', 'NEP 2020 implementation roadmap submitted', 'State government co-funding commitment', 'Compliance with reservation norms'],
      fundingRange: 'Rs 10 crore - Rs 100 crore per institution'
    }
  },
  {
    id: uuidv4(),
    title: 'Prime Minister Research Fellowship (PMRF)',
    category: 'Scholarships',
    year: 2018,
    source: 'Ministry of Education, Department of Higher Education',
    sourceDocument: 'PMRF Scheme Guidelines (Revised 2023)',
    clause: 'Sections 3-8, Eligibility and Selection',
    content: `The Prime Minister's Research Fellowship (PMRF) scheme attracts talented students for pursuing doctoral research in IITs, IISc, IISERs, and other top institutions. Key features: (1) Fellowship amount: Rs 70,000/month for first 2 years, Rs 75,000/month for 3rd year, Rs 80,000/month for 4th and 5th year. (2) Research grant of Rs 2 lakh per year. (3) Eligibility: Students from IITs/IISc/IISERs/NITs/IIITs/CFIs with CGPA >= 8.0 (Direct Entry) or GATE score >= 750 (Lateral Entry). (4) Selection through national-level screening and interview. (5) Research must be in a nationally important area as defined by the government. (6) Total number of PMRF scholars: Up to 3,000 at any given time. (7) PMRF scholars must publish at least 2 papers in peer-reviewed journals during their tenure. (8) Teaching assistantship of 8 hours per week is mandatory. (9) Annual review of progress by thesis committee. (10) The scheme is aimed at improving quality of research in India and retaining talent within the country.`,
    eligibility: {
      institutionType: ['IIT', 'IISc', 'IISER', 'NIT', 'IIIT', 'CFI'],
      requirements: ['CGPA >= 8.0 for Direct Entry from qualifying institution', 'GATE Score >= 750 for Lateral Entry', 'Must pursue PhD at IITs/IISc/IISERs/NITs', 'Research in nationally important area', 'Maximum age: 28 years at time of application'],
      fundingRange: 'Rs 70,000 - Rs 80,000 per month + Rs 2 lakh annual research grant'
    }
  },
  {
    id: uuidv4(),
    title: 'Central Sector Scheme of Scholarships (CSSS) - National Scholarship Portal',
    category: 'Scholarships',
    year: 2008,
    source: 'Department of Higher Education, Ministry of Education',
    sourceDocument: 'CSSS Guidelines 2023-24',
    clause: 'Scheme Guidelines, Eligibility Criteria',
    content: `The Central Sector Scheme of Scholarships (CSSS) for College and University Students provides financial assistance to meritorious students from economically weaker families. Key features: (1) Scholarship amount: Rs 20,000 per annum for graduation level (1-3 years), Rs 25,000 per annum for post-graduation, Rs 36,000-72,000 for professional courses. (2) Eligibility: Family income not exceeding Rs 8 lakh per annum. (3) Students must be in top 20 percentile of their respective board examination. (4) Applicable for regular courses in recognized institutions. (5) Total 82,000 fresh scholarships per year (41,000 for boys, 41,000 for girls). (6) Reservation: SC (15%), ST (7.5%), OBC (27%), PwD (5%). (7) Direct Benefit Transfer (DBT) to student bank account. (8) Application through National Scholarship Portal (NSP). (9) Renewal is automatic subject to passing previous year examination. (10) Cannot be combined with other government scholarships.`,
    eligibility: {
      institutionType: ['Any recognized University', 'Any recognized College', 'Government or Private institution with recognition'],
      requirements: ['Family income <= Rs 8 lakh per annum', 'In top 20 percentile of respective board exam', 'Regular full-time course in recognized institution', 'Not receiving any other government scholarship', 'Indian nationality'],
      fundingRange: 'Rs 20,000 - Rs 72,000 per annum'
    }
  },
  {
    id: uuidv4(),
    title: 'Anusandhan National Research Foundation (ANRF) Act 2023',
    category: 'NEP 2020',
    year: 2023,
    source: 'Ministry of Science and Technology / Ministry of Education',
    sourceDocument: 'Anusandhan National Research Foundation Act, 2023',
    clause: 'Sections 4-12, Functions and Funding',
    content: `The Anusandhan National Research Foundation (ANRF) was established through an Act of Parliament in 2023. Key provisions: (1) Total allocation of Rs 50,000 crore over 5 years (2023-28) for research and innovation. (2) ANRF will seed, grow and promote Research & Development (R&D) across all disciplines. (3) Special focus on natural sciences, engineering, technology, environmental sciences, health, agriculture, and humanities. (4) ANRF will mentor and build research capacity in state universities and colleges. (5) 60% of ANRF funding to come from non-governmental sources (industry partnerships). (6) ANRF will create a national research database and monitor research output. (7) ANRF replaces and subsumes the Science & Engineering Research Board (SERB). (8) Special provisions for research in Indian languages and Indigenous knowledge systems. (9) ANRF will fund individual researchers, research groups, and institutional research. (10) Research grant categories: Seed grants (Rs 5-25 lakh), Growth grants (Rs 25 lakh - Rs 2 crore), Transformational grants (Rs 2-50 crore).`,
    eligibility: {
      institutionType: ['University', 'College', 'Research Institution', 'Individual Researcher'],
      requirements: ['Recognized institution or affiliated researcher', 'Clear research proposal in priority area', 'Institutional commitment for matching contribution', 'Publication track record for growth and transformational grants'],
      fundingRange: 'Rs 5 lakh - Rs 50 crore depending on grant category'
    }
  },
  {
    id: uuidv4(),
    title: 'UGC NET/JRF and PhD Regulations 2022',
    category: 'UGC Regulations',
    year: 2022,
    source: 'University Grants Commission',
    sourceDocument: 'UGC PhD Regulations 2022',
    clause: 'Regulations 4.1-4.20, PhD Standards',
    content: `The UGC Minimum Standards and Procedures for Award of PhD Degree Regulations 2022 set comprehensive guidelines for doctoral programmes. Key provisions: (1) PhD admission through entrance test followed by interview - 70% weightage to entrance, 30% to interview. (2) Minimum 3 years duration for full-time PhD after Masters; 4 years after Bachelor's. (3) Coursework of 14-18 credits mandatory in first 2 semesters. (4) Pre-PhD publication of at least 1 paper in peer-reviewed journal mandatory before thesis submission. (5) Open viva voce mandatory. (6) Thesis must be checked through plagiarism detection software (less than 10% similarity allowed). (7) Supervisor can guide maximum 8 PhD scholars (full-time) and 6 (part-time). (8) UGC NET qualification with JRF is one pathway for PhD admission. (9) GATE score holders are also eligible for PhD admission with scholarship. (10) Part-time PhD provisions for working professionals with minimum 2 years experience. (11) PhD scholars receive fellowship: JRF Rs 37,000/month for 2 years, SRF Rs 42,000/month for remaining years.`
  },
  {
    id: uuidv4(),
    title: 'AICTE Model Curriculum for Engineering 2023',
    category: 'AICTE Guidelines',
    year: 2023,
    source: 'All India Council for Technical Education',
    sourceDocument: 'AICTE Model Curriculum Framework 2023',
    clause: 'Framework Document, Sections 3-8',
    content: `AICTE has released the model curriculum framework for engineering programmes aligned with NEP 2020. Key features: (1) Outcome-Based Education (OBE) mandatory for all engineering programmes. (2) 20% curriculum devoted to humanities, social sciences, and liberal arts (multidisciplinary approach). (3) Mandatory courses in Indian Knowledge Systems, Environmental Science, and Constitution of India. (4) Industry internship of minimum 14 weeks mandatory. (5) Minor specialization option with 20 additional credits in a different discipline. (6) Open electives from other departments/disciplines mandatory (minimum 12 credits). (7) Research project/capstone of minimum 12 credits in final year. (8) Coding and computational thinking course mandatory for all branches. (9) Courses on Artificial Intelligence, Machine Learning, and Data Science offered across all branches. (10) Flexibility for institutions to modify up to 30% of curriculum based on local/regional needs. (11) Continuous Internal Evaluation (CIE) weightage increased to 50%.`
  },
  {
    id: uuidv4(),
    title: 'Foreign University Campuses in India - UGC Regulations 2023',
    category: 'UGC Regulations',
    year: 2023,
    source: 'University Grants Commission',
    sourceDocument: 'UGC Foreign HEI Regulations, 2023',
    clause: 'Regulations 1-15',
    content: `The UGC regulations for setting up campuses of foreign higher education institutions in India represent a landmark reform under NEP 2020. Key provisions: (1) Foreign HEIs ranked in top 500 of global rankings (QS/THE/ARWU) can establish campuses in India. (2) These campuses will have full operational autonomy including admission, fee fixation, faculty recruitment, and curriculum design. (3) Degrees awarded will be equivalent to those awarded in the home campus. (4) Foreign campuses must offer quality of education comparable to their main campus. (5) Initial approval for 10 years, renewable for another 10 years. (6) Cross-subsidization of fees encouraged to make education accessible. (7) Foreign campuses must comply with Indian laws regarding reservation policies, anti-ragging, etc. (8) Foreign campuses can repatriate funds to home country subject to FEMA regulations. (9) Foreign campuses must collaborate with Indian institutions for joint research and faculty exchange. (10) UGC will maintain a special division for oversight of foreign campuses.`
  }
];

// ============= TIMELINE DATA =============
const TIMELINE_TOPICS = {
  'autonomy': {
    title: 'Autonomy for Colleges & Universities',
    events: [
      { year: 1986, title: 'NPE 1986', description: 'National Policy on Education introduced concept of autonomous colleges to promote excellence.', type: 'policy' },
      { year: 1994, title: 'UGC Autonomous Guidelines', description: 'First detailed UGC guidelines for grant of autonomous status to colleges.', type: 'regulation' },
      { year: 2003, title: 'Revised Autonomy Framework', description: 'UGC revised guidelines with clearer criteria and monitoring mechanisms.', type: 'regulation' },
      { year: 2018, title: 'Graded Autonomy Introduced', description: 'NAAC-linked graded autonomy framework: Category I, II, III institutions.', type: 'reform' },
      { year: 2020, title: 'NEP 2020 - Full Autonomy Vision', description: 'NEP proposed all HEIs become autonomous self-governing institutions by 2035.', type: 'policy' },
      { year: 2023, title: 'Enhanced Graded Autonomy', description: 'Revised regulations with expanded categories and greater freedoms for top-rated institutions.', type: 'regulation' },
      { year: 2025, title: 'Autonomy Progress Review', description: 'Over 1,100 colleges granted autonomous status. Ongoing assessment of quality impact.', type: 'review' }
    ]
  },
  'engineering': {
    title: 'Engineering Education Reforms',
    events: [
      { year: 1987, title: 'AICTE Act', description: 'AICTE established as statutory body for technical education regulation.', type: 'policy' },
      { year: 2000, title: 'First APH Released', description: 'Standardized approval process for new engineering institutions.', type: 'regulation' },
      { year: 2009, title: 'OBE Push', description: 'NBA introduced Outcome-Based Education framework aligned with Washington Accord.', type: 'reform' },
      { year: 2014, title: 'Washington Accord', description: 'India became permanent signatory to Washington Accord for engineering accreditation.', type: 'milestone' },
      { year: 2020, title: 'NEP 2020 Multidisciplinary', description: 'NEP mandated multidisciplinary approach with 20% humanities in engineering.', type: 'policy' },
      { year: 2023, title: 'AICTE Model Curriculum', description: 'New model curriculum with AI/ML, industry internships, and interdisciplinary focus.', type: 'regulation' },
      { year: 2024, title: 'Seat Rationalization', description: 'AICTE closed underperforming colleges, reduced total seats to improve quality.', type: 'reform' }
    ]
  },
  'research': {
    title: 'Research & Innovation Funding',
    events: [
      { year: 1986, title: 'NPE 1986 Research', description: 'National Policy emphasized research as integral part of higher education.', type: 'policy' },
      { year: 2000, title: 'DST Reforms', description: 'Department of Science & Technology restructured funding mechanisms.', type: 'reform' },
      { year: 2008, title: 'SERB Established', description: 'Science and Engineering Research Board created for competitive research funding.', type: 'milestone' },
      { year: 2018, title: 'PMRF Launched', description: "Prime Minister's Research Fellowship for attracting talent to PhD programmes.", type: 'scheme' },
      { year: 2020, title: 'NRF Proposed', description: 'National Research Foundation proposed with Rs 20,000 crore annual funding.', type: 'policy' },
      { year: 2023, title: 'ANRF Act Passed', description: 'Anusandhan NRF established with Rs 50,000 crore for 5 years.', type: 'milestone' },
      { year: 2024, title: 'ANRF Operational', description: 'First round of ANRF grants announced, SERB subsumed into ANRF.', type: 'reform' }
    ]
  },
  'access': {
    title: 'Access & Equity in Higher Education',
    events: [
      { year: 1986, title: 'NPE 1986 Equity', description: 'NPE emphasized equity and access for disadvantaged groups.', type: 'policy' },
      { year: 2006, title: 'OBC Reservation', description: '27% reservation for OBCs in central educational institutions enacted.', type: 'reform' },
      { year: 2008, title: 'National Scholarship Portal', description: 'Central Sector Scheme of Scholarships launched for meritorious students.', type: 'scheme' },
      { year: 2013, title: 'RUSA Launched', description: 'Major funding for state universities and colleges for access improvement.', type: 'scheme' },
      { year: 2019, title: 'EWS Reservation', description: '10% reservation for Economically Weaker Sections in HEIs.', type: 'reform' },
      { year: 2020, title: 'NEP 2020 GER Target', description: 'Target to increase GER from 26.3% to 50% by 2035.', type: 'policy' },
      { year: 2023, title: 'PM-USHA', description: 'Enhanced funding for institutions in aspirational districts and underserved areas.', type: 'scheme' }
    ]
  }
};

// ============= CONFLICT RULES =============
const CONFLICT_RULES = [
  {
    id: 'conflict-1',
    centralPolicy: 'NEP 2020 - Multidisciplinary Education Mandate',
    centralClause: 'All HEIs to become multidisciplinary by 2040 (Chapter 11)',
    stateConflict: 'State Affiliation Norms restricting colleges to single discipline',
    severity: 'High',
    description: 'Many state universities still require affiliated colleges to operate within single discipline boundaries. NEP 2020 mandates multidisciplinary transformation, creating a direct conflict.',
    recommendation: 'State governments should amend university acts to allow affiliated colleges to offer programmes across disciplines.'
  },
  {
    id: 'conflict-2',
    centralPolicy: 'NEP 2020 - 4-Year UG Programme with Multiple Exit',
    centralClause: 'Flexible UG programme with exit at 1, 2, 3, or 4 years (Chapter 11.9)',
    stateConflict: 'State university regulations mandating fixed 3-year UG programmes',
    severity: 'High',
    description: 'Most state universities have rigid 3-year UG programme structures with no provision for multiple entry and exit. Implementing 4-year UG with certificate/diploma exits requires complete overhaul.',
    recommendation: 'States should issue executive orders for phased implementation. UGC should provide model regulations.'
  },
  {
    id: 'conflict-3',
    centralPolicy: 'UGC Graded Autonomy Framework',
    centralClause: 'Category I institutions get full academic autonomy (Regulation 8)',
    stateConflict: 'State government control over fee structures and admissions',
    severity: 'Medium',
    description: 'While UGC grants full autonomy to Category I institutions including fee fixation, several states have fee regulatory committees that cap fees.',
    recommendation: 'A harmonized fee framework should be developed jointly by UGC and state governments.'
  },
  {
    id: 'conflict-4',
    centralPolicy: 'NEP 2020 - Mother Tongue / Regional Language Instruction',
    centralClause: 'Education in mother tongue/regional language where possible (Chapter 4)',
    stateConflict: 'Some states mandating English-only instruction in higher education',
    severity: 'Medium',
    description: 'NEP 2020 promotes instruction in mother tongue/regional languages. However, some state policies mandate English as the sole medium of instruction.',
    recommendation: 'Bilingual education models should be developed with flexibility for institutions.'
  },
  {
    id: 'conflict-5',
    centralPolicy: 'AICTE - Light-Touch Regulation under NEP 2020',
    centralClause: 'Reduced regulatory burden, outcome-based monitoring (NEP Chapter 18)',
    stateConflict: 'State technical education departments imposing additional compliance',
    severity: 'Low',
    description: 'While AICTE is moving towards light-touch regulation, some state technical education departments continue to impose additional layers of approval.',
    recommendation: 'Single-window approval system should be implemented with harmonized central-state requirements.'
  }
];

// ============= API HANDLERS =============

async function handleHealth() {
  return NextResponse.json({ success: true, message: 'MoE RAG Portal API is running', timestamp: new Date().toISOString() });
}

async function handleStats() {
  try {
    const db = await getDb();
    const policiesCount = await db.collection('policies').countDocuments();
    const chunksCount = await db.collection('chunks').countDocuments();
    const chatCount = await db.collection('chat_sessions').countDocuments();
    const categories = await db.collection('policies').distinct('category');
    return NextResponse.json({
      success: true,
      data: {
        totalPolicies: policiesCount,
        totalChunks: chunksCount,
        totalChats: chatCount,
        categories: categories,
        timelineTopics: Object.keys(TIMELINE_TOPICS).length,
        conflictRules: CONFLICT_RULES.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleSeed() {
  try {
    const db = await getDb();

    // Clear existing data
    await db.collection('policies').deleteMany({});
    await db.collection('chunks').deleteMany({});

    let totalChunks = 0;

    for (const policy of SAMPLE_POLICIES) {
      // Insert policy
      await db.collection('policies').insertOne({
        ...policy,
        createdAt: new Date().toISOString()
      });

      // Chunk the content
      const chunks = chunkText(policy.content, 150, 30);

      for (let i = 0; i < chunks.length; i++) {
        await db.collection('chunks').insertOne({
          id: uuidv4(),
          policyId: policy.id,
          policyTitle: policy.title,
          category: policy.category,
          year: policy.year,
          source: policy.source,
          sourceDocument: policy.sourceDocument || policy.source,
          clause: policy.clause || 'General',
          chunkIndex: i,
          text: chunks[i],
          createdAt: new Date().toISOString()
        });
        totalChunks++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        policiesSeeded: SAMPLE_POLICIES.length,
        chunksCreated: totalChunks,
        message: 'All policies seeded successfully with TF-IDF search!'
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleChat(request) {
  try {
    const body = await request.json();
    const { question, sessionId } = body;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    const db = await getDb();
    const currentSessionId = sessionId || uuidv4();

    // Load chat history
    let session = await db.collection('chat_sessions').findOne({ sessionId: currentSessionId });
    const history = session?.messages || [];

    // Find relevant chunks using TF-IDF search
    const relevantChunks = await searchChunks(db, question, 5);

    // Build context with citations
    let context = '';
    const citations = [];

    if (relevantChunks.length > 0) {
      relevantChunks.forEach((chunk, idx) => {
        context += `\n[Source ${idx + 1}: ${chunk.policyTitle} | ${chunk.sourceDocument} | ${chunk.clause}]\n${chunk.text}\n`;
        citations.push({
          index: idx + 1,
          policyTitle: chunk.policyTitle,
          sourceDocument: chunk.sourceDocument,
          clause: chunk.clause,
          category: chunk.category,
          year: chunk.year,
          relevanceScore: Math.round(chunk.score * 100),
          excerpt: chunk.text.substring(0, 200) + '...'
        });
      });
    }

    // Build messages for LLM
    const systemMessage = `You are an expert AI assistant for the Ministry of Education, Government of India, Department of Higher Education. You specialize in Indian education policies, regulations, and schemes.

IMPORTANT INSTRUCTIONS:
1. Answer questions based ONLY on the provided context from official policy documents.
2. Always cite your sources using [Source N] format when referencing information.
3. If the context doesn't contain enough information, clearly state that.
4. Be professional, accurate, and comprehensive.
5. Format with clear headings and bullet points where appropriate.
6. When discussing schemes, mention eligibility criteria and funding details.
7. When discussing regulations, mention specific clause numbers.

Context from Policy Database:
${context || 'No relevant policy documents found in the database.'}`;

    const messages = [{ role: 'system', content: systemMessage }];

    // Add recent history
    history.slice(-6).forEach(m => {
      messages.push({ role: m.role, content: m.content });
    });

    messages.push({ role: 'user', content: question });

    // Generate response with LLM
    const answer = await generateLLMResponse(messages);

    // Save to chat history
    const newMessages = [
      ...history,
      { role: 'user', content: question, timestamp: new Date().toISOString() },
      { role: 'assistant', content: answer, citations: citations, timestamp: new Date().toISOString() }
    ];

    await db.collection('chat_sessions').updateOne(
      { sessionId: currentSessionId },
      { $set: { sessionId: currentSessionId, messages: newMessages, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: currentSessionId,
        answer: answer,
        citations: citations,
        chunksRetrieved: relevantChunks.length
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handlePolicies(pathParts) {
  try {
    const db = await getDb();

    if (pathParts.length > 1 && pathParts[1]) {
      const policy = await db.collection('policies').findOne({ id: pathParts[1] });
      if (!policy) {
        return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: policy });
    }

    const policies = await db.collection('policies').find({}).sort({ year: -1 }).toArray();
    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleSearch(request) {
  try {
    const body = await request.json();
    const { query, category, year } = body;

    if (!query) {
      return NextResponse.json({ success: false, error: 'Search query is required' }, { status: 400 });
    }

    const db = await getDb();
    let chunks = await searchChunks(db, query, 10, category);

    if (year) {
      chunks = chunks.filter(c => c.year === parseInt(year));
    }

    const results = chunks.map(c => ({
      policyTitle: c.policyTitle,
      category: c.category,
      year: c.year,
      source: c.source,
      sourceDocument: c.sourceDocument,
      clause: c.clause,
      text: c.text,
      relevanceScore: Math.round(c.score * 100)
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleEligibility(request) {
  try {
    const body = await request.json();
    const { institutionType, studentType, cgpa, familyIncome, gateScore, naacGrade, state, category } = body;

    const db = await getDb();

    // Get all schemes with eligibility
    const schemes = await db.collection('policies').find({ eligibility: { $exists: true } }).toArray();

    const prompt = `You are an AI Eligibility Engine for the Ministry of Education, India. Analyze the following applicant profile against the available schemes and provide detailed eligibility assessment.

Applicant Profile:
- Institution Type: ${institutionType || 'Not specified'}
- Student Type: ${studentType || 'Not specified'}
- CGPA: ${cgpa || 'Not specified'}
- Family Annual Income: Rs ${familyIncome || 'Not specified'}
- GATE Score: ${gateScore || 'Not applicable'}
- NAAC Grade: ${naacGrade || 'Not specified'}
- State: ${state || 'Not specified'}
- Category: ${category || 'General'}

Available Schemes:
${schemes.map(s => `\n## ${s.title} (${s.year})\nEligibility:\n- Institution Types: ${s.eligibility?.institutionType?.join(', ')}\n- Requirements: ${s.eligibility?.requirements?.join('\n  - ')}\n- Funding: ${s.eligibility?.fundingRange}`).join('\n\n')}

For each scheme, provide:
1. **Scheme Name**
2. **Match Percentage** (0-100%)
3. **Matched Criteria** (what qualifies)
4. **Missing Criteria** (what's lacking)
5. **Recommendation**

Be specific about why criteria match or don't match. Format clearly with headers.`;

    const messages = [
      { role: 'system', content: 'You are a precise eligibility assessment engine for Indian government educational schemes.' },
      { role: 'user', content: prompt }
    ];

    const analysis = await generateLLMResponse(messages);

    return NextResponse.json({
      success: true,
      data: {
        profile: { institutionType, studentType, cgpa, familyIncome, gateScore, naacGrade, state, category },
        analysis: analysis,
        schemesEvaluated: schemes.length
      }
    });
  } catch (error) {
    console.error('Eligibility error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleTimeline(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || 'all';

    if (topic === 'all') {
      return NextResponse.json({
        success: true,
        data: {
          topics: Object.entries(TIMELINE_TOPICS).map(([key, val]) => ({
            id: key,
            title: val.title,
            eventCount: val.events.length,
            yearRange: `${val.events[0].year} - ${val.events[val.events.length - 1].year}`
          }))
        }
      });
    }

    const timelineData = TIMELINE_TOPICS[topic];
    if (!timelineData) {
      return NextResponse.json({ success: false, error: 'Timeline topic not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: timelineData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleConflictCheck(request) {
  try {
    const body = await request.json();
    const { statePolicy, centralPolicy, customQuery } = body;

    let conflictsToReturn = CONFLICT_RULES;

    if (customQuery) {
      const prompt = `You are a Policy Conflict Detector for the Ministry of Education, India. Analyze the following policy conflict query and identify contradictions between state-level rules and central NEP 2020 / UGC / AICTE guidelines.

Query: ${customQuery}

Known conflicts in the system:
${CONFLICT_RULES.map(c => `- ${c.centralPolicy} vs ${c.stateConflict} (Severity: ${c.severity})`).join('\n')}

Provide:
1. Identified conflicts
2. Severity assessment (High/Medium/Low)
3. Specific clauses that conflict
4. Recommended resolution
5. Timeline for resolution

Be specific and cite actual policy provisions where possible.`;

      const messages = [
        { role: 'system', content: 'You are an expert policy analyst for the Indian Ministry of Education.' },
        { role: 'user', content: prompt }
      ];

      const analysis = await generateLLMResponse(messages);

      return NextResponse.json({
        success: true,
        data: {
          query: customQuery,
          aiAnalysis: analysis,
          knownConflicts: conflictsToReturn
        }
      });
    }

    if (statePolicy || centralPolicy) {
      conflictsToReturn = CONFLICT_RULES.filter(c => {
        if (statePolicy && !c.stateConflict.toLowerCase().includes(statePolicy.toLowerCase())) return false;
        if (centralPolicy && !c.centralPolicy.toLowerCase().includes(centralPolicy.toLowerCase())) return false;
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        conflicts: conflictsToReturn,
        total: conflictsToReturn.length
      }
    });
  } catch (error) {
    console.error('Conflict check error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleChatSessions(pathParts) {
  try {
    const db = await getDb();

    if (pathParts.length > 1 && pathParts[1]) {
      const session = await db.collection('chat_sessions').findOne({ sessionId: pathParts[1] });
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: session });
    }

    const sessions = await db.collection('chat_sessions').find({}).sort({ updatedAt: -1 }).limit(20).toArray();
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============= ROUTE DISPATCHER =============
export async function GET(request, { params }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams?.path || [];
  const route = pathParts[0] || '';

  switch (route) {
    case 'health':
      return handleHealth();
    case 'stats':
      return handleStats();
    case 'policies':
      return handlePolicies(pathParts);
    case 'timeline':
      return handleTimeline(request);
    case 'sessions':
      return handleChatSessions(pathParts);
    default:
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
  }
}

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams?.path || [];
  const route = pathParts[0] || '';

  switch (route) {
    case 'chat':
      return handleChat(request);
    case 'seed':
      return handleSeed();
    case 'search':
      return handleSearch(request);
    case 'eligibility':
      return handleEligibility(request);
    case 'conflict-check':
      return handleConflictCheck(request);
    default:
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
  }
}
