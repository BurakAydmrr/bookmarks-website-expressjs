const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const authMiddleware = require('./middleware/authMiddleware');
const { set } = require('express/lib/application');

const app = express();

const saltRounds = 10;
dotenv.config({ path: './.env' });
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));

app.set('components', path.join(__dirname, 'partials'));


const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_ROOT,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})


// app.use(expressSession({
//     secret: 'secret',
//     resave: true,
//     saveUninitialized: true

// }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

app.use('/',authMiddleware);



app.get('/', authMiddleware, (req, res) => {
    res.render('index');

    
});


app.get('/login', (req, res) => {
    res.render('login');

});



app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/logout',(req,res) =>{

    res.clearCookie('token');
    res.clearCookie('id');
    res.redirect('/login');

});


app.get('/new_link',(req,res)=>{ 
    //const new_link_user_id = req.cookies.id; 

    res.render('new_link');   

});

app.get('/file_grups', (req, res) => {
    let file = req.query.file;
    let user_id = req.cookies.id;
  
    
    const queryGroup = 'SELECT * FROM links WHERE file_grup = ? AND user_id = ?';
    
    db.query(queryGroup, [file, user_id], (errorGroup, resultGroup) => {
      if (errorGroup) {
        console.log(errorGroup);
      } else {
        if (resultGroup.length > 0) {
          // İkinci sorgu: Tüm "links" verilerini getirir
          const queryAllLinks = 'SELECT * FROM links WHERE user_id = ?';
          db.query(queryAllLinks, [user_id], (errorAllLinks, resultAllLinks) => {
            if (errorAllLinks) {
              console.log(errorAllLinks);
            } else {
              if (resultAllLinks.length > 0) {
                const group = resultGroup;
                const links = resultAllLinks;
                console.log(group, links);
                res.render('file_grups', { group: group, links: links });
              }
            }
          });
        }
      }
    });
  });
  



app.get('/dashboard', (req, res) => {
   
    const userEmail = req.email;


    const userQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(userQuery, [userEmail], (userError, userResult) => {
        if (userError) {
            console.error(userError);
            return res.status(500).send('Internal Server Error');
        }

        if (userResult.length === 0) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        // Kullanıcının bağlantılarını veritabanından alın
        const userId = userResult[0].id;
        const linksQuery = 'SELECT * FROM links WHERE user_id = ?';
        db.query(linksQuery, [userId], (linksError, linksResult) => {
            if (linksError) {
                console.error(linksError);
                return res.status(500).send('Internal Server Error');
            }

            const userData = userResult[0];

            const linkData = linksResult;


            res.render('dashboard' , { user: userData, link: linkData });
         
        });
    });



});




app.post('/login', (req, res) => {

    const email = req.body.email;
    const password = req.body.pass;

    const query = 'SELECT * FROM users WHERE email = ? ';

    const plainPassword = password;

    db.query(query, [email], (error, result) => {
        if (error) {
            console.log(error);
        } else {
            if (result.length > 0) {
                const userId = result[0].id;
                const userName = result[0].name;

                bcrypt.compare(plainPassword, result[0].password, (err, result) => {
                    if (err) {
                        console.error(err);
                    } else {
                        if (result) {
                        var token = jwt.sign({ email: email, date: new Date() }, process.env.JWT_SECRET)
                       
    
                        res.cookie('token', token);
                        res.cookie('id', userId)

                        res.redirect('/dashboard');        
                           
                        } else {
                            res.status(401).send('Kullanıcı bilgileri yanlış');
                        }
                    }
                });

            } else {
                res.status(401).send('Kullanıcı bilgileri yanlış');
            }
        }

    });

});

app.post('/register', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.pass;

    const plainPassword = password;

    bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
        if (err) {
            console.error(err);
        } else {
            const query = 'INSERT INTO users SET name = ?, email = ?, password = ?';

            db.query(query, [name, email, hash], (error, result) => {
                if (error) {
                    console.log(error);
                } else {
            
    
                    res.redirect('/login');

                    
                }
            });
        }
    });
});


app.post('/new_link',(req,res)=>{
    const linkname = req.body.linkname;
    const file_grup = req.body.file_grup;
    const link = req.body.link;
    const description = req.body.description;
    const user_id = req.cookies.id; 

    
    const query = 'INSERT INTO links SET linkname = ?, file_grup = ?, link = ?, description = ? , user_id = ?';

    db.query(query, [linkname, file_grup, link, description,user_id], (error, result) => {
        if (error) {
            console.log(error);
        } else {

           if(result){
              
              res.redirect('/dashboard');


              }
        }
    });
});


app.get('/link_delete', (req, res) => {
    const id = req.query.id;
    console.log(id);
    const query = 'DELETE FROM links WHERE id = ?';

    db.query(query, [id], (error, result) => {
        if (error) {
            console.log(error);
        }else {
            
       res.redirect('/dashboard');

    }
   
    });
});


app.get('/link_update/:id', (req, res) => {
    const id = req.params.id;
   

    const query = 'SELECT * FROM links WHERE id = ?';

    db.query(query, [id], (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send('Internal Server Error');
        } else {
            if (result.length > 0) {
                const data = {
                    link: result[0]
                };
                res.render('link_update', data);
            } else {
                res.status(404).send('Link not found');
            }
        }
    });
});


app.post('/link_update/:id', (req, res) => {
    const id = req.params.id;
   

    const { linkname, file_grup, link, description } = req.body;

    const query = 'UPDATE links SET linkname = ?, file_grup = ?, link = ?, description = ? WHERE id = ?';

    db.query(query, [linkname, file_grup, link, description, id], (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/dashboard');
        }
    });
});




    



app.listen(5000, () => {
    db.connect((error) => {
        if (error) {
            console.log(error)
        } else {
            console.log(" Server started on port 5000 And Mysql Connected..")
        }
    });
    


    
});