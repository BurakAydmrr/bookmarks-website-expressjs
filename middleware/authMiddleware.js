const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const token = req.cookies.token;

    var data = [
        '/login',
        '/register'
    ];
    

    if (data.includes(req.url)) {
        try {
            let decode = jwt.verify(token, process.env.JWT_SECRET)
            res.render('index');
            return;

        } catch (err) {
            next();
            return;
            console.log(err);
        }
    }

    try {
        let decode = jwt.verify(token, process.env.JWT_SECRET)
        req.email = decode.email;

        next();
    } catch (err) {
        res.redirect('/login');
        console.log(err);

    }



}


module.exports = authMiddleware;