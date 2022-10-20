const express = require('express')
const expressHandlebars = require('express-handlebars')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3')
const expressSession = require('express-session')
const SQLiteStore = require('connect-sqlite3')(expressSession)
const bcrypt = require('bcrypt')


const TITLE_LENGTH = 50
const ADMIN_USERNAME = "Eliise"
const ADMIN_PASSWORD = "$2b$10$ZHvYbsaoK967szYXtGa6euHhovpUkG2/aT/siPdM9tru5WBSCaCa2"
const DB_ERROR_MESSAGE = "Internal server error! Please try again later"



//----------DATABASES--------------
const db = new sqlite3.Database("my-database.db")

db.run(`
    CREATE TABLE IF NOT EXISTS allPosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        mainText TEXT,
        mediaType TEXT
    )`
)

db.run(`
    CREATE TABLE IF NOT EXISTS allFeedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reviewer TEXT,
        feedbackText TEXT
    )
`)

db.run(`
    CREATE TABLE IF NOT EXISTS allRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titleRequest TEXT
    )
`)



const app = express()

app.engine('hbs', expressHandlebars.engine({
    defaultLayout: "main.hbs"
}))


app.use(bodyParser.urlencoded({
    extended: false
}))

app.use(express.static('node_modules/spectre.css/dist'))
app.use(express.static('static'))


app.use(expressSession({
    secret: "rtgyhuikolpokhb vggc", //For sessions to be securely implemented session IDs should be random unique long string
    saveUninitialized: false, //if the session is empty, should it be stored - not worth to store
    resave: false, //we sont make any changes we dont need to store a new session when logged in again?
    store: new SQLiteStore()
}))

app.use(function(request, response, next){
    const isLoggedIn = request.session.isLoggedIn

    response.locals.isLoggedIn = isLoggedIn

    next()
})



//--------------VALIDATION ERRORS---------------
function getValidationErrorsForBlogPosts(title, mainText, mediaType){

    const errorMessages = []

    if (title == ""){
        errorMessages.push("Please add a title")
    }else if(title.length > TITLE_LENGTH){
        errorMessages.push("Title can't be longer than " +TITLE_LENGTH+ " characters")
    }

    if (mainText == ""){
        errorMessages.push("Please add a post text")
    }

    if (mediaType == null){
        errorMessages.push("Please choose a media type")
    }

    return errorMessages
}

function getValidationErrorsForFeedback(reviewer, feedbackText){

    const errorMessages = []

    if (reviewer == ""){
        errorMessages.push("Please add a name!")
    }

    if (feedbackText == ""){
        errorMessages.push("Please add a feedback!")
    }

    return errorMessages

}

function getValidationErrorsForRequests(titleRequest){

    const errorMessages = []

    if (titleRequest == ""){
        errorMessages.push("Please add a title")
    }

    return errorMessages

}

function getValidationErrorsForLogin(enteredUsername, enteredPassword){
    
    const errorMessages = []

    if (enteredUsername == ""){
        errorMessages.push("Please add an username")
    }

    if (enteredPassword == ""){
        errorMessages.push("Please add a password")
    }

    return errorMessages

}



//GET
//Start page
app.get('/', function(request, response){
    response.render("start.hbs")
})

//About page
app.get('/about', function(request, response){
    response.render("about.hbs")
})

//Contact page
app.get('/contact', function(request, response){
    response.render("contact.hbs")
})



//--------------------BLOG POSTS-----------------------
//All Posts page
app.get('/allPosts', function(request, response){

    const query = `SELECT * FROM allPosts ORDER BY id`

    db.all(query, function(error, allPosts){

        const errorMessages = []

        if(error){
            console.log(error)

            errorMessages.push(DB_ERROR_MESSAGE)
        }

        const model = {
            posts: allPosts,
            errorMessages
        }

        response.render("allPosts.hbs", model)        
    })
})


//Create page
app.get('/create', function(request, response){

    if(request.session.isLoggedIn){
        response.render('create.hbs')
    } else {
        response.redirect('/login')
    }

})

app.post('/create', function(request,response){

    const title = request.body.title
    const mainText = request.body.mainText
    const mediaType = request.body.mediaType

    const errorMessages = getValidationErrorsForBlogPosts(title, mainText, mediaType)

    if (!request.session.isLoggedIn){
        errorMessages.push("Please log in!")
    }

    if (errorMessages.length == 0){

        const query = `INSERT INTO allPosts (title, mainText, mediaType) VALUES (?, ?, ?)`
        const values = [title, mainText, mediaType]

        db.run(query, values, function(error){
            if(error){
                console.log(error)

                errorMessages.push(DB_ERROR_MESSAGE)
                
                const model = {
                    errorMessages,
                    title,
                    mainText
                }

                response.render('create.hbs', model)

            } else{

            response.redirect('/allPosts/'+this.lastID)

            }
        })
    } else{
        const model = {
            errorMessages,
            title,
            mainText
        }
        response.render('create.hbs', model)
    }  
})


//Blog post page
app.get('/allPosts/:id', function(request, response){
    
    const id = request.params.id

    const query = `SELECT * FROM allPosts WHERE id = ?`
    values = [id]

    db.get(query, values, function(error, blogPost){
        const errorMessages = []

        if(error){
            console.log(error)

            errorMessages.push(DB_ERROR_MESSAGE)
        }

        const model = {
            blogPost
        }

        response.render('blogPost.hbs', model)
    })
})


//Updating blog post
app.get('/updateBlogPost/:id', function(request, response){

    if(request.session.isLoggedIn){

        const id = request.params.id

        const query = `SELECT * FROM allPosts WHERE id = ?`
        values = [id]

        db.get(query, values, function(error, blogPost){
            const errorMessagesForDatabase = []

            if(error){
                console.log(error)

                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
            }

            const model = {
                blogPost,
                errorMessagesForDatabase
            }

            response.render('updateBlogPost.hbs', model)
        })

    } else {

        response.redirect('/login')

    }
})

app.post('/updateBlogPost/:id', function(request, response){

    const id = request.params.id
    const newTitle = request.body.title
    const newMainText = request.body.mainText
    const newMediaType = request.body.mediaType
    
    const errorMessages = getValidationErrorsForBlogPosts(newTitle, newMainText, newMediaType)

    if (!request.session.isLoggedIn){
        errorMessages.push("Please log in!")
    }

    if(errorMessages.length == 0){

        const query = `UPDATE allPosts SET title=?, mainText=?, mediaType=? WHERE id = ?`

        const values = [newTitle, newMainText, newMediaType, id]

        db.run(query, values, function(error){

            const errorMessagesForDatabase = []

            if(error){
                console.log(error)

                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)

                const model = {
                    blogPost:{
                        title: newTitle,
                        mainText: newMainText,
                        mediaType: newMediaType
                    },
                    errorMessages,
                    errorMessagesForDatabase
                }

                response.render('updateBlogPost.hbs', model)

            } else{
                response.redirect('/allPosts/'+id)
            }
        })
    } else {

        const model = {
            blogPost:{
                title: newTitle,
                mainText: newMainText,
                mediaType: newMediaType
            },
            errorMessages
        }

        response.render('updateBlogPost.hbs', model)

    }
})


//Delete blog page
app.post('/deleteBlogPost/:id', function(request, response){

    if(request.session.isLoggedIn){

        const id = request.params.id

        const query = `DELETE FROM allPosts WHERE id = ?`
        const values = [id]
        const errorMessages = []

        db.run(query, values, function(error){

            if(error){
                console.log(error)

                errorMessages.push(DB_ERROR_MESSAGE)
                
                const model = {
                    errorMessages
                }

                response.render('blogPost.hbs', model)

            } else{
                response.redirect('/allPosts')
            }
        })

    } else {

        response.redirect('/login')

    }
})



//----------------FEEDBACK----------------
//All feedback page
app.get('/feedback', function(request, response){

    const query = `SELECT * FROM allFeedback ORDER BY id`

    db.all(query, function(error, allFeedback){

        const errorMessages = []

        if(error){
            console.log(error)

            errorMessages.push(DB_ERROR_MESSAGE)
        }
        const model = {
            allFeedback: allFeedback,
            errorMessages
        }

        response.render("allFeedback.hbs", model)        
    })
})


//Add feedback page
app.get('/addFeedback', function(request, response){

    response.render('addFeedback.hbs')

})

app.post('/addFeedback', function(request, response){

    const reviewer = request.body.reviewer
    const feedbackText = request.body.feedbackText

    const errorMessages = getValidationErrorsForFeedback(reviewer, feedbackText)

    if (errorMessages.length == 0){

        const query = `INSERT INTO allFeedback (reviewer, feedbackText) VALUES (?, ?)`
        const values = [reviewer, feedbackText]

        db.run(query, values, function(error){
            if(error){
                console.log(error)

                errorMessages.push(DB_ERROR_MESSAGE)
                
                const model = {
                    errorMessages,
                    reviewer,
                    feedbackText
                }

                response.render('addFeedback.hbs', model)

            } else{

            response.redirect('/feedback')

            }
        })
    } else {
        const model = {
            errorMessages,
            reviewer,
            feedbackText
        }

        response.render('addFeedback.hbs', model)
    }
})


//Updating feedback
app.get('/updateFeedback/:id', function(request, response){

    if(request.session.isLoggedIn){

        const id = request.params.id

        const query = `SELECT * FROM allFeedback WHERE id = ?`
        values = [id]

        db.get(query, values, function(error, feedback){
            const errorMessagesForDatabase = []

            if(error){
                console.log(error)
                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
            }

            const model = {
                errorMessagesForDatabase,
                feedback
            }

            response.render('updateFeedback.hbs', model)
        })

    } else {

        response.redirect('/login')

    }
})

app.post('/updateFeedback/:id', function(request, response){

    const id = request.params.id
    const reviewer = request.body.reviewer
    const newFeedbackText = request.body.feedbackText
    
    const errorMessages = getValidationErrorsForFeedback(reviewer, newFeedbackText)
    const errorMessagesForDatabase = []

    if(!request.session.isLoggedIn){
        errorMessages.push("Please log in!")
    }

    if(errorMessages.length == 0){

        const query = `UPDATE allFeedback SET feedbackText=? WHERE id = ?`

        const values = [newFeedbackText, id]

        db.run(query, values, function(error){

            if(error){
                console.log(error)

                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)

                const model = {
                    feedback:{
                        feedbackText: newFeedbackText
                    },
                    errorMessages,
                    errorMessagesForDatabase
                }

                response.render('updateFeedback.hbs', model)

            } else{
                response.redirect('/feedback')
            }
        })
    } else {

        const model = {
            feedback:{
                reviewer: reviewer,
                reviewText: newFeedbackText
            },
            errorMessages
        }

        response.render('updateFeedback.hbs', model)

    }
})


//Delete feedbck
app.post('/deleteFeedback/:id', function(request, response){

    if(request.session.isLoggedIn){

        const id = request.params.id

        const query = `DELETE FROM allFeedback WHERE id = ?`
        const values = [id]
        const errorMessages = []

        db.run(query, values, function(error){

            if(error){
                console.log(error)

                errorMessages.push(DB_ERROR_MESSAGE)
                
                const model = {
                    errorMessages
                }

                response.render('allFeedback.hbs', model)

            } else{
                response.redirect('/feedback')
            }
        })

    } else {

        response.redirect('/login')

    }
})



//----------------REQUESTS------------------
//All Requests page
app.get('/allRequests', function(request, response){

    const query = `SELECT * FROM allRequests ORDER BY id`

    db.all(query, function(error, allRequests){

        const errorMessagesForDatabase = []

        if(error){
            console.log(error)
            errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
        }
        const model = {
            requests: allRequests,
            errorMessagesForDatabase
        }

        response.render("allRequests.hbs", model)        
    })

})

//Creating a request
app.post('/allRequests', function(request, response){

    const titleRequest = request.body.titleRequest

    const errorMessages = getValidationErrorsForRequests(titleRequest)
    const errorMessagesForDatabase = []

    if (errorMessages.length == 0){

        const query = `INSERT INTO allRequests (titleRequest) VALUES (?)`
        const values = [titleRequest]

        db.run(query, values, function(error){

            if(error){
                console.log(error)

                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
                
                const model = {
                    errorMessagesForDatabase
                }
        
                response.render('allRequests.hbs', model)

            } else{

            response.redirect('/allRequests')

            }
        })
    } else {
    
        const query = `SELECT * FROM allRequests ORDER BY id`

        db.all(query, function(error, allRequests){
            
            const errorMessagesForDatabase = []

            if(error){
                console.log(error)
                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
            }
            
            const model = {
                requests: allRequests,
                errorMessages,
                errorMessagesForDatabase
            }

        response.render("allRequests.hbs", model)     
        })
    }
})

//Updating request
app.get('/updateRequest/:id', function(request, response){

    if(request.session.isLoggedIn){

        const id = request.params.id
        const query = `SELECT * FROM allRequests WHERE id = ?`
        const values = [id]
        const errorMessagesForDatabase = []

        db.get(query, values, function(error, request){
            const errorMessages = []

            if(error){
                console.log(error)

                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
            }

            const model = {
                errorMessagesForDatabase,
                errorMessages,
                request
            }

            response.render('updateRequest.hbs', model)
        })

    } else {

        response.redirect('/login')

    }
})

app.post('/updateRequest/:id', function(request, response){

    const id = request.params.id
    const newTitleRequest = request.body.titleRequest
    
    const errorMessages = getValidationErrorsForRequests(newTitleRequest)

    if(!request.session.isLoggedIn){
        errorMessages.push("Please log in!")
    }

    if(errorMessages.length == 0){

        const query = `UPDATE allRequests SET titleRequest=? WHERE id = ?`

        const values = [newTitleRequest, id]

        db.run(query, values, function(error){

            if(error){
                console.log(error)

                errorMessages.push(DB_ERROR_MESSAGE)

                const model = {
                    request:{
                        titleRequest: newTitleRequest
                    },
                    errorMessages
                }

                response.render('updateRequest.hbs', model)

            } else{
                response.redirect('/allRequests')
            }
        })
    } else {

        const model = {
            request:{
                titleRequest: newTitleRequest
            },
            errorMessages
        }

        response.render('updateRequest.hbs', model)

    }
})

//Delete request
app.post('/deleteRequest/:id', function(request, response){

    if(request.session.isLoggedIn){

        const id = request.params.id

        const query = `DELETE FROM allRequests WHERE id = ?`
        const values = [id]
        const errorMessagesForDatabase = []

        db.run(query, values, function(error){

            if(error){
                console.log(error)

                errorMessagesForDatabase.push(DB_ERROR_MESSAGE)
            
                const model = {
                    errorMessagesForDatabase
                }

                response.render('allRequests.hbs', model)
                
            } else{
                response.redirect('/allRequests')
            }

        })

    } else {

        response.redirect('/login')

    }
})



//-------------LOGGING IN-----------------
//Login page
app.get('/login', function(request, response){

    response.render("login.hbs")

})

app.post('/login', function(request, response){

    const enteredUsername = request.body.username
    const enteredPassword = request.body.password

    const errorMessages = getValidationErrorsForLogin(enteredUsername, enteredPassword)
    const passwordIsCorrect = bcrypt.compareSync(enteredPassword, ADMIN_PASSWORD)

    if (errorMessages.length == 0){
        if (enteredUsername == ADMIN_USERNAME && passwordIsCorrect) {

            request.session.isLoggedIn = true

            response.redirect('/')
        } else {

            if(enteredUsername != ADMIN_USERNAME) {
                errorMessages.push("Wrong usename!")
            }  

            if(passwordIsCorrect == false){
                errorMessages.push("Could not log in! Incorrect password")  
            } 

            const model = {
                errorMessages,
                enteredUsername
            }
            response.render('login.hbs', model)
        }
    } else {

        const model = {
            errorMessages,
            enteredUsername
        }

        response.render('login.hbs', model)
    }
})

//Log out
app.post('/logout', function(request, response){

    request.session.isLoggedIn = false

    response.redirect('/')
})


app.listen(8080)