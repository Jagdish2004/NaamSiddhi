module.exports.searchRecord =(req,res)=>{
    res.render('records/search.ejs', {
        profiles: [
          {
            firstName: "Rahul",
            lastName: "Sharma",
            dob: new Date('1990-05-15'),
            gender: "male",
            role: "criminal",
            imageUrl: "/images/rahul.png",
          },
          {
            firstName: "Priya",
            lastName: "Singh",
            dob: new Date('1995-10-10'),
            gender: "female",
            role: "witness",
            imageUrl: null, // Defaults to placeholder image
          }
        ]
    });

}