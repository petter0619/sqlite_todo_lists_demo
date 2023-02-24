const express = require('express')
const router = express.Router()
const { isAuthenticated } = require('../middleware/authenticationMiddleware')
const { getAllLists, getListById, createNewList, deleteListById } = require('../controllers/listController')
const { createNewTodo } = require('../controllers/todoController')

router.get('/', isAuthenticated, getAllLists)
router.get('/:listId', isAuthenticated, getListById)

router.post('/', isAuthenticated, createNewList)
router.post('/:listId/todos', isAuthenticated, createNewTodo)

router.delete('/:listId', isAuthenticated, deleteListById)

module.exports = router
