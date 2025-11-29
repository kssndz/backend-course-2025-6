import { program } from 'commander';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

program
	.requiredOption('-h, --host <address>', 'host address')
	.requiredOption('-p, --port <number>', 'server port')
	.requiredOption('-c, --cache <path>', 'path to cache directory')

program.parse();
const options = program.opts();

const dir = `./${options.cache}`;
if (!fs.existsSync(dir))
	fs.mkdirSync(dir);

const __dirname = import.meta.dirname;

const origin = `http://${options.host}:${options.port}`;
const storage = multer.diskStorage({
	destination: `./${options.cache}`,
	filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
let inventoryList = [];
let nextId = 1;


const app = express();

const swaggerOptions = swaggerJSDoc({
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Inventory Management API',
			version: '1.0.0',
			description: 'API for managing inventory items with photo uploads'
		},
		servers: [{ url: origin }],
	},
	apis: ['./index.js']
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerOptions));
app.use(express.json());
app.use(express.urlencoded());

/**
 * @openapi
 * /register:
 *   post:
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [inventory_name]
 *             properties:
 *               inventory_name: {type: string}
 *               description: {type: string}
 *               photo: {type: string, format: binary}
 *     responses:
 *       201: {description: Success}
 *       400: {description: Bad request}
 */
app.post('/register', upload.single('photo'), (req, res) => {
	const { inventory_name, description } = req.body;
	const photo = req.file;

	if (!inventory_name)
		return res.status(400).json({ error: 'inventory_name is required' });

	const item = {
		id: nextId++,
		inventory_name: inventory_name,
		description: description ? description : '',
		photo: photo ?
			photo.filename :
			null,
	};
	inventoryList.push(item);

	return res.status(201).json({ message: 'item registered successfully '});
});

/**
 * @openapi
 * /inventory:
 *   get:
 *     responses:
 *       200: {description: List of items}
 */
app.get('/inventory', (req, res) => {
	return res.status(200).json({ inventoryList });
});

/**
 * @openapi
 * /inventory/{id}:
 *   get:
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: {type: integer}
 *     responses:
 *       200: {description: Item details}
 *       404: {description: Not found}
 */
app.get('/inventory/:id', (req, res) => {
	const itemId = parseInt(req.params.id);
	const item = inventoryList.find(item => item.id === itemId);

	if (!item)
		return res.status(404).json({ error: 'item not found' });

	return res.status(200).json({ item });
});

/**
 * @openapi
 * /inventory/{id}:
 *   put:
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: {type: integer}
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               inventory_name: {type: string}
 *               description: {type: string}
 *     responses:
 *       201: {description: Updated}
 *       404: {description: Not found}
 */
app.put('/inventory/:id', (req, res) => {
	const itemId = parseInt(req.params.id);
	const item = inventoryList.find(item => item.id === itemId);

	if (!item)
		return res.status(404).json({ error: 'item not found' });

	const { inventory_name, description } = req.body;
	if (inventory_name)
		item.inventory_name = inventory_name;
	if (description)
		item.description = description;

	return res.status(201).json({ message: 'item updated successfully' });
});

/**
 * @openapi
 * /inventory/{id}/photo:
 *   get:
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: {type: integer}
 *     responses:
 *       200: {description: Photo file}
 *       404: {description: Not found}
 */
app.get('/inventory/:id/photo', (req, res) => {
	const itemId = parseInt(req.params.id);
	const item = inventoryList.find(item => item.id === itemId);

	if (!item || !item.photo)
		return res.status(404).json({ error: 'photo not found' });

	const absolutePath = path.join(__dirname, options.cache, item.photo);

	res.sendFile(absolutePath, (err) => {
		if (err)
			return res.status(404).json({ error: 'photo not found' });
	});
});

/**
 * @openapi
 * /inventory/{id}/photo:
 *   put:
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: {type: integer}
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               photo: {type: string, format: binary}
 *     responses:
 *       201: {description: Updated}
 *       404: {description: Not found}
 */
app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
	const itemId = parseInt(req.params.id);
	const item = inventoryList.find(item => item.id === itemId);

	if (!item)
		return res.status(404).json({ error: 'item not found' });

	item.photo = req.file.filename;

	return res.status(201).json({ message: 'photo updated successfully' });
});

/**
 * @openapi
 * /inventory/{id}/photo:
 *   put:
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: {type: integer}
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               photo: {type: string, format: binary}
 *     responses:
 *       201: {description: Updated}
 *       404: {description: Not found}
 */
app.delete('/inventory/:id', (req, res) => {
	const itemId = parseInt(req.params.id);
	const originalLength = inventoryList.length;
	inventoryList = inventoryList.filter(item => item.id !== itemId);

	if (inventoryList.length === originalLength)
		return res.status(404).json({ error: 'item not found' });
	
	return res.status(200).json({ message: 'item deleted successfully' });
});

app.get('/RegisterForm.html', (req, res) => {
	res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (req, res) => {
	res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

/**
 * @openapi
 * /search:
 *   get:
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         schema: {type: integer}
 *       - name: includePhoto
 *         in: query
 *         schema: {type: string}
 *     responses:
 *       200: {description: Item found}
 *       404: {description: Not found}
 */
app.get('/search', (req, res) => {
	console.log(req.query);
	const { id, includePhoto } = req.query;

	const itemId = parseInt(id);
	const hasPhoto = (includePhoto === 'on');
	const item = inventoryList.find(item => item.id === itemId);

	if (!item)
		return res.status(404).json({ error: 'item not found' });

	const absolutePath = path.join(__dirname, options.cache, item.photo);

	return res.status(200).json({
		id: item.id,
		inventory_name: item.inventory_name,
		description: item.description,
		photo: hasPhoto ? absolutePath : null
	});
});

app.all('/*all', (req, res) => {
	res.status(405).json({ error: 'method not allowed' });
});

app.listen(options.port, options.host, () => {
	console.log(`Server running at ${origin}/`);
});
