import express from "express";
import { createAccount, loginAccountWithPassword } from "../controllers/auth/auth.controller.js";
const Router  = express.Router();

export  default Router;

// Auth Routing
Router.post('/create-account',createAccount)
Router.post('/login',loginAccountWithPassword)