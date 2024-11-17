module.exports.searchRecord =(req,res)=>{
    res.render('records/search.ejs', {
      profiles: [
        {
          firstName: {
            hindi: "राहुल",
            english: "Rahul"
          },
          lastName: {
            hindi: "शर्मा",
            english: "Sharma"
          },
          dob: new Date('1990-05-15'),
          gender: "male",
          role: "criminal",
          imageUrl: "/images/rahul.png",
          address: {
            locationHindi: "अशोक नगर",
            cityHindi: "जयपुर",
            stateHindi: "राजस्थान",
            locationEnglish: "Ashok Nagar",
            cityEnglish: "Jaipur",
            stateEnglish: "Rajasthan"
          }
        },
        {
          firstName: {
            hindi: "प्रिया",
            english: "Priya"
          },
          lastName: {
            hindi: "सिंह",
            english: "Singh"
          },
          dob: new Date('1995-10-10'),
          gender: "female",
          role: "witness",
          imageUrl: null, // Defaults to placeholder image
          address: {
            locationHindi: "सिविल लाइन्स",
            cityHindi: "लखनऊ",
            stateHindi: "उत्तर प्रदेश",
            locationEnglish: "Civil Lines",
            cityEnglish: "Lucknow",
            stateEnglish: "Uttar Pradesh"
          }
        }
      ]      
    });

}