import express from "express";
import { createAccount, getMe, loginAccountWithPassword, logoutUser } from "../controllers/auth/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import { createCategory, deleteCategory, getAllCategories, getCategories, getCategoryByIdOrSlug, updateCategory } from "../controllers/categories/categories.controller.js";
import { createPost, deletePost, privatePosts, privateViewPost, publicPosts, singleViewPost, updatePost } from "../controllers/post/post.controller.js";
import { deleteMedia, getMyMedias, uploadMedia } from "../controllers/media/media.contollers.js";
import { upload } from "../middleware/upload.middleware.js";
import { createNewsLatter, deleteSubscriber, getAllSubscribers } from "../controllers/newslatter/newslatter.controller.js";
import { createMessage, deleteMessage, getAllMessages, getMessageById, updateMessage } from "../controllers/messages/message.controller.js";
import { createLead, deleteLead, getAllLeads, getLeadById, updateLead } from "../controllers/leads/lead.controller.js";
import { getDashboardAnalytics } from "../controllers/analytics/analytics.controller.js";
import { createPostComment, getPostEngagement, recordPostView } from "../controllers/blog-engagement/blog-engagement.controller.js";
import { deleteComment, getAllComments, updateComment } from "../controllers/comments/comments.controller.js";
import { createTeamMember, deleteTeamMember, getAllTeamMembers, updateTeamMember } from "../controllers/team/team.controller.js";
import { createUser, deleteUser, getAllUsers, updateUser } from "../controllers/users/users.controller.js";
import { mcpLogin } from "../controllers/mcp/mcp.auth.controller.js";

const Router  = express.Router();

export  default Router;

// Auth Routing
Router.post('/create-account',createAccount)
Router.post('/login',loginAccountWithPassword)
Router.get('/me',verifyToken, getMe)
Router.post('/auth/logout', verifyToken, logoutUser)

// Analytics
Router.get('/analytics/dashboard', verifyToken, getDashboardAnalytics)

// Users & team
Router.get('/users', verifyToken, getAllUsers)
Router.post('/users', verifyToken, createUser)
Router.patch('/users/:id', verifyToken, updateUser)
Router.delete('/users/:id', verifyToken, deleteUser)

Router.get('/team', verifyToken, getAllTeamMembers)
Router.post('/team', verifyToken, createTeamMember)
Router.patch('/team/:id', verifyToken, updateTeamMember)
Router.delete('/team/:id', verifyToken, deleteTeamMember)

// Comment moderation
Router.get('/comments', verifyToken, getAllComments)
Router.patch('/comments/:id', verifyToken, updateComment)
Router.delete('/comments/:id', verifyToken, deleteComment)

// Category 
Router.post('/create-category', verifyToken, createCategory)
Router.get('/categories', getCategories)
Router.get('/categories/all', verifyToken, getAllCategories)
Router.get('/category/:id', getCategoryByIdOrSlug)
Router.put('/category/:id', verifyToken, updateCategory)
Router.delete('/category/:id', verifyToken, deleteCategory)

Router.post("/mcp-login", mcpLogin);

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

Router.get('/post/:slug/engagement', getPostEngagement)
Router.post('/post/:slug/views', recordPostView)
Router.post('/post/:slug/comments', createPostComment)
Router.get('/post/:slug', singleViewPost)

// FIX: new route — mirrors the /private/posts naming used for the list
// route above. Lives under /private/post/:id (by id, for the editor UI),
// so it never collides with the public /post/:slug route — they sit under
// completely different path prefixes, not just different param names.
Router.get('/private/post/:id', verifyToken, privateViewPost)



// Media Folder
Router.post('/media/upload',upload.array("file",10),verifyToken,uploadMedia)
Router.get('/media/me',verifyToken,getMyMedias)
Router.delete('/media/:id',verifyToken,deleteMedia)


// subscriber

Router.post('/newslatter',createNewsLatter)
Router.get('/newslatter',verifyToken,getAllSubscribers)
Router.delete('/newslatter/:id',verifyToken,deleteSubscriber)

// messages

Router.post('/messages',createMessage)
Router.get('/messages',verifyToken,getAllMessages)
Router.get('/messages/:id',verifyToken,getMessageById)
Router.patch('/messages/:id',verifyToken,updateMessage)
Router.delete('/messages/:id',verifyToken,deleteMessage)

// leads

Router.post('/leads',createLead)
Router.get('/leads',verifyToken,getAllLeads)
Router.get('/leads/:id',verifyToken,getLeadById)
Router.patch('/leads/:id',verifyToken,updateLead)
Router.delete('/leads/:id',verifyToken,deleteLead)
