import express from "express";
import { createAccount, getMe, loginAccountWithPassword, logoutUser } from "../controllers/auth/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import { createCategory, deleteCategory, getAllCategories, getCategories, getCategoryByIdOrSlug, updateCategory } from "../controllers/categories/categories.controller.js";
import { createPost, deletePost, privatePosts, privateViewPost, publicPosts, singleViewPost, updatePost } from "../controllers/post/post.controller.js";
import { getMyMedias, uploadMedia } from "../controllers/media/media.contollers.js";
import { upload } from "../middleware/upload.middleware.js";
import { createNewsLatter, deleteSubscriber, getAllSubscribers } from "../controllers/newslatter/newslatter.controller.js";

const Router  = express.Router();

export  default Router;

// Auth Routing
Router.post('/create-account',createAccount)
Router.post('/login',loginAccountWithPassword)
Router.get('/me',verifyToken, getMe)
Router.post('/auth/logout', verifyToken, logoutUser)

// Category 
Router.post('/create-category', verifyToken, createCategory)
Router.get('/categories', getCategories)
Router.get('/categories/all', verifyToken, getAllCategories)
Router.get('/category/:id', getCategoryByIdOrSlug)
Router.put('/category/:id', verifyToken, updateCategory)
Router.delete('/category/:id', verifyToken, deleteCategory)


// Post Routing

// FIX: add `updatePost` and `privateViewPost` to your existing controller
// import line — both now exist in the controller but had no route pointing
// to them yet. e.g.:
// import { createPost, publicPosts, privatePosts, deletePost, updatePost, singleViewPost, privateViewPost } from "../../controllers/blog/post.controller.js";

Router.post('/create-post', verifyToken, createPost)
Router.get("/public/posts", publicPosts)
Router.get("/private/posts", verifyToken, privatePosts)
Router.delete('/post/:id', verifyToken, deletePost)

// FIX: new route — PATCH (not PUT), since updatePost only changes the
// fields the client actually sends rather than requiring a full
// replacement of the whole document.
Router.patch('/post/:id', verifyToken, updatePost)

Router.get('/post/:slug', singleViewPost)

// FIX: new route — mirrors the /private/posts naming used for the list
// route above. Lives under /private/post/:id (by id, for the editor UI),
// so it never collides with the public /post/:slug route — they sit under
// completely different path prefixes, not just different param names.
Router.get('/private/post/:id', verifyToken, privateViewPost)



// Media Folder
Router.post('/media/upload',upload.array("file",10),verifyToken,uploadMedia)
Router.get('/media/me',verifyToken,getMyMedias)


// subscriber

Router.post('/newslatter',createNewsLatter)
Router.get('/newslatter',verifyToken,getAllSubscribers)
Router.delete('/newslatter/:id',verifyToken,deleteSubscriber)