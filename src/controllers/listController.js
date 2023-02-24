const { QueryTypes } = require('sequelize')
const { userRoles, listRoles } = require('../constants/users')
const { sequelize } = require('../database/config')
const { UnauthorizedError, NotFoundError } = require('../utils/errors')

exports.getAllLists = async (req, res) => {
	let query
	let options = {}
	if (req.user.role === userRoles.ADMIN) {
		query = `
      SELECT lists.id AS listId, lists.name, users.id AS userId, users.email, roles.role_name FROM lists 
      LEFT JOIN users_lists ON lists.id = users_lists.fk_lists_id 
      LEFT JOIN users ON users_lists.fk_users_id = users.id
      LEFT JOIN roles ON roles.id = users_lists.fk_roles_id;
    `
	} else {
		query = `
      SELECT lists.id AS listId, lists.name, roles.role_name FROM lists 
      LEFT JOIN users_lists ON lists.id = users_lists.fk_lists_id 
      LEFT JOIN roles ON roles.id = users_lists.fk_roles_id
      WHERE users_lists.fk_users_id = $userId;
    `
		options.bind = { userId: req.user.userId }
	}
	const [results, metadata] = await sequelize.query(query, options)

	return res.json(results)
}

exports.getListById = async (req, res) => {
	const listId = req.params.listId

	const [results, metadata] = await sequelize.query(
		`
			SELECT l.id, l.name, t.todo, t.done 
			FROM lists l 
				LEFT JOIN todos t ON t.fk_lists_id = l.id
			WHERE l.id = $listId;
		`,
		{
			bind: { listId: listId },
		}
	)

	if (!results || results.length == 0) {
		throw new NotFoundError('We could not find the list you are looking for')
	}

	const listResponse = {
		listId: listId,
		// @ts-ignore
		listName: results[0].name,
		todos: results.map((listTodo) => {
			// @ts-ignore
			return { todo: listTodo.todo, done: listTodo.done }
		}),
	}

	return res.json(listResponse)
}

exports.createNewList = async (req, res) => {
	const { name } = req.body

	const [newListId] = await sequelize.query('INSERT INTO lists (name) VALUES ($listName);', {
		bind: { listName: name },
		type: QueryTypes.INSERT, // returns ID of created row
	})

	// prettier-ignore
	await sequelize.query(`
    INSERT INTO users_lists (fk_users_id, fk_lists_id, fk_roles_id) 
    VALUES ($userId, $listId, (SELECT id FROM roles WHERE role_name = 'owner')) 
  `,
		{
			bind: {
				userId: req.user.userId,
				listId: newListId,
			},
		}
	)
	// prettier-ignore
	return res
    .setHeader('Location', `${req.protocol}://${req.headers.host}/api/v1/lists/${newListId}`)
    .sendStatus(201)
}

exports.deleteListById = async (req, res) => {
	const listId = req.params.listId

	if (req.user.role !== userRoles.admin) {
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
			throw new NotFoundError('We could not find the list you are looking for')
		}

		// @ts-ignore
		if (userListRole?.role_name !== listRoles.owner) {
			throw new UnauthorizedError('You do not have permission to delete this list')
		}
	}

	await sequelize.query(`DELETE FROM users_lists WHERE fk_lists_id = $listId;`, {
		bind: { listId: listId },
		type: QueryTypes.DELETE,
	})

	await sequelize.query(`DELETE FROM todos WHERE fk_lists_id = $listId;`, {
		bind: { listId: listId },
	})

	await sequelize.query(`DELETE FROM lists WHERE id = $listId;`, {
		bind: { listId: listId },
		type: QueryTypes.DELETE,
	})

	return res.sendStatus(204)
}
