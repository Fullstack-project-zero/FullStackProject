const express = require('express');
const Place = require('../models/Place.model');
const User = require('../models/User.model');
const router = express.Router();
const { isLoggedIn, isLoggedOut, authorUser } = require('../middleware/route-guard.js');

const fileUploader = require('../config/cloudinary.config');

//PLACES LIST
// /places-list	GET	Get list of all places
router.get('/places', (req, res) => {
  Place.find().populate('author')
    .then(places => {
      res.render('places/places', { places });
    })
    .catch(error => {
      console.error(error);
      res.send('Error fetching data');
    });
});


// /create	GET	Get new place form

router.get("/places/create", isLoggedIn, (req, res) => {
  res.render("places/create-new-place");
});


// /create	POST	Create new place

router.post('/places/create', fileUploader.single('img'), (req, res) => {

  const { name, location, description, source, title } = req.body;
  if ( !req.file?.path) {
    res.render("places/create-new-place", { errorMessage: 'All fields are mandatory. Please provide an image.' });
    return
  }

  Place.create({ name, location, description, img: req.file?.path, author: req.session.currentUser?._id, source, title })
    .then(newPlace => {
      res.redirect('/places/'+ newPlace._id);
    })
    .catch(error => {
      console.error(error);
      res.status(500).render('places/create-new-place', { errorMessage: error });
    });
});



// /places/:placeId	GET	Get details of place
router.get('/places/:placeId', (req, res) => {

  Place.findById(req.params.placeId).populate('author')
    .then((places) => {
      console.log(places)
      res.render('places/place-details', { places });
    })
    .catch((error) => {
      console.error(error);
      res.send('Error fetching data', error);

    })

});


// /edit/:placeId	get	edit place

router.get('/places/:placeId/edit', (req, res) => {
  const userId = req.session.currentUser?._id;
  Place.findById(req.params.placeId).populate('author')

    .then((places) => {
      const authorUser = places.author[0]?._id.toString()
      console.log(authorUser);
      if (authorUser.includes(userId)) {
        res.render('places/place-edit', { places });
      } else {
        res.redirect('/login'); 
      }
    })

    .catch((error) => {
      console.error(error);
      res.send('Error fetching data');
    })
});

//POST edit places
router.post('/places/:placeId/edit', fileUploader.single("img"), (req, res) => {

  const placeId = req.params.placeId;
  const { name, location, description, source, title, previousImg } = req.body;

  Place.findByIdAndUpdate(placeId, { name, location, description, img: req.file?.path || previousImg, source, title })
    .then(() => {
      res.redirect('/places/'+ placeId);
    })
    .catch(error => {
      console.error(error);
      res.send('Error updating data');
    });
});

// DELETE we need to create a form in place-edit.hbs
router.post('/places/:placeId/delete', isLoggedIn, (req, res) => {

  Place.findByIdAndRemove(req.params.placeId)
    .then(() => {
      res.redirect('/places/my-places/'+ req.session.currentUser._id);
    })
    .catch(error => {
      console.error(error);
      res.send('Error deleting data');
    });
});

// DISPLAY USER CREATIONS IN USER PROFILE

router.get('/places/my-places/:userId', authorUser, (req, res) => {
  const userId = req.params.userId;

  Place.find({ author: userId }).populate('author')
    .then(userPlaces => {
      res.render('places/my-places', { userPlaces });
    })
    .catch(error => {
      console.error(error);
      res.send('Error fetching data');
    });
});

// Search bar

router.post("/search", (req, res) => {
  const searchInput = req.body.searchInput
  Place.find({ "name": { $regex: `${searchInput}`, $options: "i" } }).populate("author")
    .then((places) => {
      console.log(places);
      res.render("places/places", {places})
    })
    .catch(error => {
      console.error(error);
      res.send('Error fetching data');
    });
});

// Update like's in the place

router.post('/places/:placeId/like', isLoggedIn, (req, res) => {
  const placeId = req.params.placeId;
  const userId = req.session.currentUser._id;

  Place.findById(placeId)
    .then((place) => {
      if (!place) {
        return res.status(404).send('Place not found');
      }

      if (place.likes.includes(userId)) {
        return Place.updateOne({ _id: placeId }, { $pull: { likes: userId } });
      } else {
        return Place.updateOne({ _id: placeId }, { $addToSet: { likes: userId } });
      }
    })
    .then(() => {
      res.redirect("/places/" + placeId);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Error processing request');
    });
});

module.exports = router;
