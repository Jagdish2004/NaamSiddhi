const express = require('express');
const router = express.Router();
const Profile = require('../models/profileSchema'); 

router.get('/api/suggestions', async (req, res) => {
    try {
      const { query } = req.query;
  
      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
  
      const regex = new RegExp(query, 'i'); // Case-insensitive regex for matching
      const results = await Profile.find({
        $or: [
          { 'firstNameEnglish': regex },
          { 'firstNameHindi': regex }
        ]
      })
        .limit(10)
        .select('firstNameEnglish firstNameHindi');
  
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

module.exports = router;
