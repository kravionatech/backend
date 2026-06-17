import express from "express";
import { createAccount, getMe, loginAccountWithPassword } from "../controllers/auth/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import { createCategory, deleteCategory, getAllCategories, getCategories, getCategoryByIdOrSlug, updateCategory } from "../controllers/categories/categories.controller.js";
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