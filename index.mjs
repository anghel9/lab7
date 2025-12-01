import express from 'express';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import session from 'express-session';

const app = express();

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'cst 336 csumb',
  resave: false,
  saveUninitialized: true
  //cookie: { secure: true }
}))

app.set('view engine', 'ejs');
app.use(express.static('public'));
//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));
//setting up database connection pool
const pool = mysql.createPool({
    host: "zj2x67aktl2o6q2n.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "kc522l6xjnyhmnpv",
    password: "r5j5bmicxwbtjxta",
    database: "s7mlmus6xkm8ydm1",
    connectionLimit: 10,
    waitForConnections: true
});

//routes
app.get('/', (req, res) => {
   res.render('login.ejs')
});

app.get('/home', isUserAuthenticated, (req, res) => {
    if(req.session.isUserAuthenticated){
        res.render('home.ejs')  
    }else{
        res.redirect('/');
    }

});

app.get('/logout', (req, res) => {
    req.session.destroy();
   res.redirect('/')
});

app.get('/profile', isUserAuthenticated, (req, res) => {
    res.render('profile.ejs')
    // if(req.session.isUserAuthenticated){
    //     res.render('profile.ejs')  
    // }else{
    //     res.redirect('/');
    // }
});


app.post('/loginProcess', async(req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let hashPass = "";
    let sql=`SELECT * FROM users WHERE username = ?`;
    const [rows]= await pool.query(sql, [username]);
    if(rows.length >0){
        hashPass = rows[0].password;
    }
    const match = await bcrypt.compare(password, hashPass);

    if(match){
        req.session.isUserAuthenticated = true;
        req.session.fullName = rows[0].firstName+" "+rows[0].lastName;
        res.render('home.ejs')
    } else {
        res.render('login.ejs', {"loginError": "Wrong Credentials"})
    }
});

app.post('/deleteQuote', isUserAuthenticated, async (req, res) => {
    if(req.session.isUserAuthenticated){
        let quoteId = req.body.quoteId;
        if (!quoteId) 
            return res.redirect('/quotes');
        await pool.query('DELETE FROM quotes WHERE quoteId = ?', [quoteId]);
        res.redirect('/quotes');
    }else{
        res.redirect('/');
    }
});


app.get('/updateQuote', isUserAuthenticated, async(req, res) => {
    if(req.session.isUserAuthenticated){
        let quoteId = req.query.quoteId;
        let sql = `SELECT * FROM quotes
                    WHERE quoteId = ?`
        const [quoteInfo] = await pool.query(sql, [quoteId]);
        let sql2 = `SELECT DISTINCT category 
                FROM quotes`;
        let sql3 = `SELECT DISTINCT firstName, lastName 
                    FROM authors`;
        const [authors] = await pool.query(sql3);
        const [category] = await pool.query(sql2);           
        res.render('updateQuote.ejs', {authors, category, quoteInfo})
    }else{
        res.redirect('/');
    }
});

app.post('/updateQuote', isUserAuthenticated, async (req, res) => {
    if (req.session.isUserAuthenticated) {
        let quoteId = req.body.quoteId;
        let quote = req.body.quote;
        let authorId = req.body.authorId;
        let category = req.body.category;
        let sql = 'UPDATE quotes SET quote = ?, authorId = ?, category = ? WHERE quotes.quoteId=?';
        let params=[quote, authorId, category, quoteId];
        const [quoteInfo] = await pool.query(sql, params);
        res.redirect('/quotes');
    } else {
        res.redirect('/');
    }
});

app.get('/quotes', isUserAuthenticated, async(req, res) => {
    if(req.session.isUserAuthenticated){
        let sql =`SELECT quoteId, quote
                FROM quotes`;
        const [quotes] = await pool.query(sql);
        res.render('quotes.ejs',{quotes})
    }else{
        res.redirect('/');
    }
});

app.get('/updateAuthor', isUserAuthenticated, async(req, res) => {
    if(req.session.isUserAuthenticated){
        let authorId = req.query.id;
        let sql= `SELECT *,
                DATE_FORMAT(dob, '%Y-%m-%d') ISOdob,
                DATE_FORMAT(dod, '%Y-%m-%d') ISOdod
                FROM authors
                WHERE authorId=?`
        const [authorInfo] = await pool.query(sql, [authorId]);
        res.render('updateAuthor.ejs', {authorInfo})
    }else{
        res.redirect('/');
    }
});

app.post('/updateAuthor', isUserAuthenticated, async(req, res) => {
    if(req.session.isUserAuthenticated){
        let authorId = req.body.authorId;
        let fName = req.body.fn;
        let lName = req.body.ln;
        let sql = `UPDATE authors
                    SET firstName = ?, lastName=?
                    WHERE authorId = ?`
        let sqlParams = [fName, lName, authorId];
        const [authorInfo] = await pool.query(sql, sqlParams);
        res.redirect('/authors');
    }else{
        res.redirect('/');
    }
});

app.post('/deleteAuthor', isUserAuthenticated, async(req, res) => {
   if(req.session.isUserAuthenticated){
        let authorId = req.body.authorId;
        if (!authorId) 
            return res.redirect('/authors');
        await pool.query('DELETE FROM authors WHERE authorId = ?', [authorId]);
        res.redirect('/authors');
    }else{
        res.redirect('/');
    }
});

app.get('/authors', isUserAuthenticated, async(req, res) => {
    if(req.session.isUserAuthenticated){
        let sql = `SELECT authorId, firstName, lastName
                    FROM authors
                    ORDER BY lastName`
        const [authors] = await pool.query(sql);
        res.render('authors.ejs', {authors})
    }else{
        res.redirect('/');
    }
});


//Displays form to add a new quote
app.get('/addQuote', isUserAuthenticated, async(req, res) => {
//    let quote = req.body.quote;
    if(req.session.isUserAuthenticated){
        let sql = `SELECT DISTINCT category 
                FROM quotes`;
        let sql2 = `SELECT DISTINCT firstName, lastName 
                    FROM authors`;
        const [authors] = await pool.query(sql2);
        const [category] = await pool.query(sql);
        res.render('addQuote.ejs', {authors, category})
    }else{
        res.redirect('/');
    }  
});


app.post('/addQuote',isUserAuthenticated, async(req, res) => {
    //    let quote = req.body.quote;
    if(req.session.isUserAuthenticated){
       
        let quote = req.body.quote;
        let authorId = req.body.authorId;
        let category = req.body.category;
        await pool.query('INSERT INTO quotes (quote, authorId, category) VALUES (?, ?, ?)', [quote, authorId, category]);
        res.redirect('/quotes');
        
    }else{
        res.redirect('/');
    } 
});

//Displays form to add a new author
app.get('/addAuthor',isUserAuthenticated, (req, res) => {
    if(req.session.isUserAuthenticated){
        res.render('addAuthor.ejs')
    }else{
        res.redirect('/');
    } 
});

//Stores author data into the database
app.post('/addAuthor', isUserAuthenticated, async (req, res) => {
    if(req.session.isUserAuthenticated){
        let firstName = req.body.fn;
        let lastName = req.body.ln;
        let sql = `INSERT INTO authors
                    (firstName, lastName)
                    VALUES (?, ?)`;
        let sqlParams = [firstName, lastName];  
        const [rows] = await pool.query(sql, sqlParams);       
        res.render('addAuthor.ejs')
    }else{
        res.redirect('/');
    } 
});

app.get("/dbTest", async(req, res) => {
   try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest

function isUserAuthenticated(req, res, next){
    if(req.session.isUserAuthenticated){
        next();
    }else{
        res.redirect('/');
    }
}

app.listen(3000, ()=>{
    console.log("Express server running")
})
