const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = '7fd7e68ba2msh0495524c398efb1p1d056ejsn5fd6715142b9';

app.get('/api/upcoming-events', async (req, res) => {
  try {
    const response = await axios.get('https://api.b365api.com/v3/events/upcoming', {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'betsapi2.p.rapidapi.com',
      },
      params: req.query,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Proxy server running on http://localhost:3001');
});
