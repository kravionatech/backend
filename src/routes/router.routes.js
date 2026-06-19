import express from "express";
import { createAccount, getMe, loginAccountWithPassword } from "../controllers/auth/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import { createCategory, deleteCategory, getAllCategories, getCategories, getCategoryByIdOrSlug, updateCategory } from "../controllers/categories/categories.controller.js";
import { createPost, deletePost, privatePosts, publicPosts, singleViewPost } from "../controllers/post/post.controller.js";

const Router  = express.Router();

export  default Router;

// Auth Routing
Router.post('/create-account',createAccount)
Router.post('/login',loginAccountWithPassword)
Router.get('/me',verifyToken, getMe)

// Category 
Router.post('/create-category', verifyToken, createCategory)
Router.get('/categories', getCategories)
Router.get('/categories/all', verifyToken, getAllCategories)
Router.get('/category/:id', getCategoryByIdOrSlug)
Router.put('/category/:id', verifyToken, updateCategory)
Router.delete('/category/:id', verifyToken, deleteCategory)


// Post Routing
Router.post('/create-post', verifyToken, createPost)    
Router.get("/public/posts",publicPosts)
Router.get("/private/posts",verifyToken,privatePosts)
Router.delete('/post/:id',verifyToken,deletePost)
Router.get('/post/:slug',singleViewPost)