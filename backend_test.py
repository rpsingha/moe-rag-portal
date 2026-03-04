#!/usr/bin/env python3
"""
MoE RAG Portal Backend API Test Suite
Tests all backend endpoints for the Ministry of Education RAG platform.
"""

import requests
import json
import sys
from datetime import datetime

# Base URL for the deployed application
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def print_test_header(test_name):
    """Print formatted test header"""
    print("\n" + "="*60)
    print(f"TESTING: {test_name}")
    print("="*60)

def print_success(message):
    """Print success message"""
    print(f"✅ SUCCESS: {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ ERROR: {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  INFO: {message}")

def test_health_check():
    """Test GET /api/health - should return success"""
    print_test_header("Health Check API")
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Health check passed")
                print_info(f"Message: {data.get('message', '')}")
                print_info(f"Timestamp: {data.get('timestamp', '')}")
                return True
            else:
                print_error("Health check returned success=false")
                return False
        else:
            print_error(f"Health check failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Health check request failed: {str(e)}")
        return False

def test_seed_database():
    """Test POST /api/seed - should seed 12 policies and create chunks"""
    print_test_header("Database Seed API")
    
    try:
        response = requests.post(f"{API_BASE}/seed", timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Database seeding completed")
                seed_data = data.get('data', {})
                print_info(f"Policies seeded: {seed_data.get('policiesSeeded', 0)}")
                print_info(f"Chunks created: {seed_data.get('chunksCreated', 0)}")
                print_info(f"Message: {seed_data.get('message', '')}")
                return True
            else:
                print_error("Seed returned success=false")
                print_error(f"Response: {response.text}")
                return False
        else:
            print_error(f"Seed failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Seed request failed: {str(e)}")
        return False

def test_stats_api():
    """Test GET /api/stats - should return policy counts, chunk counts, categories"""
    print_test_header("Stats API")
    
    try:
        response = requests.get(f"{API_BASE}/stats", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Stats API working")
                stats = data.get('data', {})
                print_info(f"Total Policies: {stats.get('totalPolicies', 0)}")
                print_info(f"Total Chunks: {stats.get('totalChunks', 0)}")
                print_info(f"Total Chats: {stats.get('totalChats', 0)}")
                print_info(f"Categories: {len(stats.get('categories', []))}")
                print_info(f"Timeline Topics: {stats.get('timelineTopics', 0)}")
                print_info(f"Conflict Rules: {stats.get('conflictRules', 0)}")
                return True
            else:
                print_error("Stats returned success=false")
                return False
        else:
            print_error(f"Stats failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Stats request failed: {str(e)}")
        return False

def test_chat_api():
    """Test POST /api/chat - send questions and test session continuity"""
    print_test_header("RAG Chat API")
    
    # Test 1: First question
    try:
        payload = {
            "question": "What is NEP 2020?"
        }
        response = requests.post(f"{API_BASE}/chat", json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("First chat question processed")
                chat_data = data.get('data', {})
                session_id = chat_data.get('sessionId')
                print_info(f"Session ID: {session_id}")
                print_info(f"Answer length: {len(chat_data.get('answer', ''))}")
                print_info(f"Citations: {len(chat_data.get('citations', []))}")
                print_info(f"Chunks retrieved: {chat_data.get('chunksRetrieved', 0)}")
                
                # Test 2: Session continuity with follow-up question
                if session_id:
                    print_info("Testing session continuity...")
                    followup_payload = {
                        "question": "What are the key features of multidisciplinary education mentioned?",
                        "sessionId": session_id
                    }
                    
                    followup_response = requests.post(f"{API_BASE}/chat", json=followup_payload, timeout=60)
                    
                    if followup_response.status_code == 200:
                        followup_data = followup_response.json()
                        if followup_data.get('success') == True:
                            print_success("Session continuity working")
                            followup_chat_data = followup_data.get('data', {})
                            print_info(f"Same session ID: {followup_chat_data.get('sessionId') == session_id}")
                            return True
                        else:
                            print_error("Followup chat returned success=false")
                            return False
                    else:
                        print_error(f"Followup chat failed with status {followup_response.status_code}")
                        return False
                else:
                    print_error("No session ID returned from first chat")
                    return False
            else:
                print_error("Chat returned success=false")
                return False
        else:
            print_error(f"Chat failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Chat request failed: {str(e)}")
        return False

def test_search_api():
    """Test POST /api/search - send search query and verify results"""
    print_test_header("Policy Search API")
    
    try:
        payload = {
            "query": "scholarship eligibility"
        }
        response = requests.post(f"{API_BASE}/search", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Search API working")
                results = data.get('data', [])
                print_info(f"Search results count: {len(results)}")
                
                if len(results) > 0:
                    print_info(f"First result relevance score: {results[0].get('relevanceScore', 0)}")
                    print_info(f"First result policy: {results[0].get('policyTitle', 'N/A')}")
                    return True
                else:
                    print_error("No search results returned")
                    return False
            else:
                print_error("Search returned success=false")
                return False
        else:
            print_error(f"Search failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Search request failed: {str(e)}")
        return False

def test_policies_api():
    """Test GET /api/policies - should return list of all policies"""
    print_test_header("Policies List API")
    
    try:
        response = requests.get(f"{API_BASE}/policies", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Policies API working")
                policies = data.get('data', [])
                print_info(f"Total policies: {len(policies)}")
                
                if len(policies) > 0:
                    print_info(f"First policy: {policies[0].get('title', 'N/A')}")
                    print_info(f"First policy year: {policies[0].get('year', 'N/A')}")
                    return True
                else:
                    print_error("No policies returned")
                    return False
            else:
                print_error("Policies returned success=false")
                return False
        else:
            print_error(f"Policies failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Policies request failed: {str(e)}")
        return False

def test_timeline_api():
    """Test GET /api/timeline - test both topic=all and specific topic"""
    print_test_header("Timeline API")
    
    # Test 1: Get all timeline topics
    try:
        response = requests.get(f"{API_BASE}/timeline?topic=all", timeout=30)
        print(f"Status Code (topic=all): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Timeline API (topic=all) working")
                timeline_data = data.get('data', {})
                topics = timeline_data.get('topics', [])
                print_info(f"Available topics: {len(topics)}")
                
                if len(topics) > 0:
                    print_info(f"First topic: {topics[0].get('title', 'N/A')}")
                    
                    # Test 2: Get specific timeline topic (autonomy)
                    autonomy_response = requests.get(f"{API_BASE}/timeline?topic=autonomy", timeout=30)
                    
                    if autonomy_response.status_code == 200:
                        autonomy_data = autonomy_response.json()
                        if autonomy_data.get('success') == True:
                            print_success("Timeline API (topic=autonomy) working")
                            autonomy_timeline = autonomy_data.get('data', {})
                            events = autonomy_timeline.get('events', [])
                            print_info(f"Autonomy timeline events: {len(events)}")
                            return True
                        else:
                            print_error("Autonomy timeline returned success=false")
                            return False
                    else:
                        print_error(f"Autonomy timeline failed with status {autonomy_response.status_code}")
                        return False
                else:
                    print_error("No timeline topics returned")
                    return False
            else:
                print_error("Timeline returned success=false")
                return False
        else:
            print_error(f"Timeline failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Timeline request failed: {str(e)}")
        return False

def test_conflict_check_api():
    """Test POST /api/conflict-check - test both empty and custom query"""
    print_test_header("Conflict Check API")
    
    # Test 1: Get known conflicts (empty payload)
    try:
        response = requests.post(f"{API_BASE}/conflict-check", json={}, timeout=30)
        print(f"Status Code (known conflicts): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Conflict Check API (known conflicts) working")
                conflict_data = data.get('data', {})
                conflicts = conflict_data.get('conflicts', [])
                print_info(f"Known conflicts: {len(conflicts)}")
                
                # Test 2: Custom query analysis
                custom_payload = {
                    "customQuery": "fee regulation conflict"
                }
                
                custom_response = requests.post(f"{API_BASE}/conflict-check", json=custom_payload, timeout=60)
                
                if custom_response.status_code == 200:
                    custom_data = custom_response.json()
                    if custom_data.get('success') == True:
                        print_success("Conflict Check API (custom query) working")
                        custom_conflict_data = custom_data.get('data', {})
                        print_info(f"Custom query: {custom_conflict_data.get('query', 'N/A')}")
                        print_info(f"AI Analysis length: {len(custom_conflict_data.get('aiAnalysis', ''))}")
                        print_info(f"Known conflicts: {len(custom_conflict_data.get('knownConflicts', []))}")
                        return True
                    else:
                        print_error("Custom conflict check returned success=false")
                        return False
                else:
                    print_error(f"Custom conflict check failed with status {custom_response.status_code}")
                    return False
            else:
                print_error("Conflict check returned success=false")
                return False
        else:
            print_error(f"Conflict check failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Conflict check request failed: {str(e)}")
        return False

def test_eligibility_api():
    """Test POST /api/eligibility - send profile data for analysis"""
    print_test_header("Eligibility Engine API")
    
    try:
        payload = {
            "institutionType": "IIT",
            "studentType": "PhD",
            "cgpa": "8.5",
            "familyIncome": "500000",
            "gateScore": "780"
        }
        
        response = requests.post(f"{API_BASE}/eligibility", json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') == True:
                print_success("Eligibility Engine API working")
                eligibility_data = data.get('data', {})
                print_info(f"Profile analyzed: {eligibility_data.get('profile', {})}")
                print_info(f"Analysis length: {len(eligibility_data.get('analysis', ''))}")
                print_info(f"Schemes evaluated: {eligibility_data.get('schemesEvaluated', 0)}")
                return True
            else:
                print_error("Eligibility returned success=false")
                return False
        else:
            print_error(f"Eligibility failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Eligibility request failed: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests in sequence"""
    print("MoE RAG Portal Backend API Test Suite")
    print("=====================================")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test started at: {datetime.now()}")
    
    # Store test results
    test_results = {}
    
    # Run tests in the sequence specified in the review request
    test_results['health'] = test_health_check()
    test_results['seed'] = test_seed_database()
    test_results['stats'] = test_stats_api()
    test_results['chat'] = test_chat_api()
    test_results['search'] = test_search_api()
    test_results['policies'] = test_policies_api()
    test_results['timeline'] = test_timeline_api()
    test_results['conflict_check'] = test_conflict_check_api()
    test_results['eligibility'] = test_eligibility_api()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results.items():
        status = "PASS" if result else "FAIL"
        icon = "✅" if result else "❌"
        print(f"{icon} {test_name.upper()}: {status}")
        
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal Tests: {len(test_results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(test_results)*100):.1f}%")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        return True
    else:
        print(f"\n⚠️  {failed} TEST(S) FAILED!")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)