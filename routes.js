let fs = require('fs')
let multiparty = require('multiparty')
let then = require('express-then')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
// let util = require('util')
let DataUri = require('datauri')
module.exports = (app) => {
    let passport = app.passport

    app.get('/', (req, res) => {
        res.render('index.ejs')
    })

    app.get('/login', (req, res) => {
        res.render('login.ejs', {
            message: req.flash('error')
        })
    })

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }))

    app.get('/signup', (req, res) => {
        res.render('signup.ejs', {
            message: req.flash('error')
        })
    })

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }))

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })



  app.get('/post/:postId?', then(async(req, res) => {
      let postId = req.params.postId
      if (!postId) {
        res.render('post.ejs', {
          post: {},
          verb: 'Create'
        })
        return
      }
      let post = await Post.promise.findById(postId)
      if (!post) res.status(404).send('Not found')

      let dataUri = new DataUri()
      let image
      let imageData
      if (post.image.data) {
        image = dataUri.format('.' + post.image.contentType.split('/').pop(), post.image.data)
        imageData = `data:${post.image.contentType};base64,${image.base64}`
      }
      console.log(">< image", image)
      res.render('post.ejs', {
        post: post,
        verb: 'Edit',
        image: imageData
      })

    }))

  app.post('/post/:postId?', then(async(req, res) => {
      let postId = req.params.postId
      let post
      if (!postId) {
          post = new Post()
      } else {
          post = await Post.promise.findById(postId)
          if (!post) res.status(404).send('Not found')
      }

      let [{title: [title], content: [content]}, {image: [file]}] = await new multiparty.Form().promise.parse(req)
      post.title = title
      post.content = content
      console.log(file, title, content)
      if (file.originalFilename !== '') {
        post.image.data = await fs.promise.readFile(file.path)
        post.image.contentType = file.headers['content-type']
      }
      //console.log(file, title, content, post)

      // if (!postId) {
      //     // assign user id to the post
      //     post.user_id = req.user._id
      // }
      await post.save()
      //TODO
      res.redirect('/blog/' + encodeURI(req.user.blogTitle))
      return
   }))


}