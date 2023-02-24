const express = require('express')
const router = express.Router()
const { isAuthenticated } = require('../middleware/authenticationMiddleware')
const { getAllTodos, getTodoById, createNewTodo, deleteTodoById, updateTodoById } = require('../controllers/todoController')

router.get('/', isAuthenticated, getAllTodos)
router.get('/:todoId', isAuthenticated, getTodoById)
router.post('/', isAuthenticated, createNewTodo)
router.put('/:todoId', isAuthenticated, updateTodoById)
router.delete('/:todoId', isAuthenticated, deleteTodoById)

module.exports = router
