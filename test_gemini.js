const axios = require('axios');
axios.get('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCkc8zpHFK40kZwt2bd8jqHrptinICd3AI')
    .then(res => console.log(res.data.models.map(m => m.name)))
    .catch(err => console.error(err.response.status, err.response.data));
