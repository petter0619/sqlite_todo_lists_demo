const { QueryTypes } = require('sequelize')
const { userRoles } = require('../constants/users')
const { sequelize } = require('../database/config')
const { UnauthorizedError } = require('../utils/errors')

exports.getAllTodos = (req, res) => res.send('getAllTodos')
exports.getTodoById = (req, res) => {
	return res.send('getTodoById')
}

exports.createNewTodo = async (req, res) => {
	const todo = req.body.todo
	const listId = req.params.listId || req.body.listId

	if (req.user.role !== userRoles.ADMIN) {
		const [userListRole, userListRoleMeta] = await sequelize.query(
			`
        SELECT r.role_name 
        FROM users_lists ul
          JOIN roles r ON r.id = ul.fk_roles_id 
        WHERE ul.fk_lists_id = $listId AND fk_users_id = $userId 
        LIMIT 1
      `,
			{
				bind: { listId: listId, userId: req.user.userId },
				type: QueryTypes.SELECT,
			}
		)

		if (!userListRole) {
			throw new UnauthorizedError('You are not allowed to perform this action')
		}
	}

	const [newTodoId] = await sequelize.query('INSERT INTO todos (todo, fk_lists_id) VALUES ($todo, $listId);', {
		bind: { todo: todo, listId: listId },
		type: QueryTypes.INSERT, // returns ID of created row
	})

	// prettier-ignore
	return res
    .setHeader('Location', `${req.protocol}://${req.headers.host}/api/v1/lists/${newTodoId}`)
    .sendStatus(201)
}

exports.updateTodoById = (req, res) => res.send('updateTodoById')
exports.deleteTodoById = (req, res) => res.send('deleteTodoById')
