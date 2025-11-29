import { program } from 'commander';
import fs from 'fs';
import express from 'express';
import multer from 'multer';

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

app.all('/*all', (req, res) => {
	res.status(405).json({ error: 'method not allowed' });
})

app.listen(options.port, options.host, () => {
	console.log(`Server running at ${origin}/`);
})
