const express = require('express');
const User = require("./db/user");
const Product = require("./db/product");
const app = express();
const cors = require('cors')
const Jwt=require('jsonwebtoken');
const jwtKey='e-comm';//kept secret

require('./db/config');
require('./db/user');
const PORT = 5000;

app.use(cors())
app.use(express.json());
app.post("/signup", async (req, res) => { 
    // res.send("api in progress...")
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password;
    Jwt.sign({result},jwtKey,{expiresIn:"2h"},(err,token)=>{
        if(err){
            res.send({ result: "something went wrong please try later" });
        }
        res.send({result,auth:token});
    })
});

app.post("/login", async (req, res) => {
    console.log(req.body);
    if (req.body.password && req.body.email) {
        let user = await User.findOne(req.body).select("-password");
        //check if correct user
        if (user) {
            Jwt.sign({user},jwtKey,{expiresIn:"2h"},(err,token)=>{
                if(err){
                    res.send({ result: "something went wrong please try later" });
                }
                res.send({user,auth:token});
            })
           
        }
        else {
            res.send({ result: "No user found" });
        }
    }
    else {
        res.send({ result: "No user found" });
    }

})

function verifyToken(req,res,next){//middleware
    var token=req.headers['authorization'];
    if(token){
        token=token.split(' ')[1]
        console.warn("middleware called",token);
        Jwt.verify(token,jwtKey,(err,valid)=>{
            if(err){
                res.status(401).send({result:"Please provide valid token "})
            }
            else{
                next();
            }
        });
    }
    else{
        res.status(403).send({result:"Please add token with header"})
    }
}

app.post("/add",verifyToken, async (req, res) => {
    let product = new Product(req.body);
    let result = await product.save();
    res.send(result);
})

app.get("/products", verifyToken,async (req, res) => {
    try{

        const products = await Product.find();
        if (products.length > 0) {
            res.send(products);
        }
        else {
            res.send({ result: "No Product Found" });
        }
    }catch(err){
        res.status(404).send("Error occured in /products");
    }
})

app.delete("/product/:id", verifyToken,async (req, res) => {
    //    res.send(req.params.id);
    const result = await Product.deleteOne({ _id: req.params.id })
    res.send(result);
})

app.get("/product/:id", verifyToken,async (req, res) => {
    let result = await Product.findOne({ _id: req.params.id });
    if (result) {
        res.send(result);
    }
    else
        res.send({ result: "No record found" });
});

app.put("/product/:id",verifyToken, async (req, res) => {
    let result = await Product.updateOne(
        { _id: req.params.id },
        {
            $set: req.body
        }
    )
    res.send(result)
});

app.get("/search/:key",verifyToken, async (req, res) => { 
    const key = req.params.key;
    let result = await Product.find({//await used when func returns promise
        "$or": [//when search for more than one thing
            { name: {$regex:key} },//key=name value=$ part
            { company: {$regex:key} },
            { category: {$regex:key} }
        ]
    });
    res.send(result);
})


app.listen(PORT, () => {
    console.log(`Server connected on port ${PORT}`);
})
