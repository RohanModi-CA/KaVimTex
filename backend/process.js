const net = require('net');
const fs = require('fs');
const { promisify } = require('util');
const render = require('./render.js');
const { exec } = require('child_process');

const KVTRoot = process.argv[2];
const filepath = process.argv[5];

const newcommands_file = KVTRoot + "/backend/resources/aliases.txt";
const kill_script_path = KVTRoot + "/backend/kill_processes.sh";
const delimiter = "KVTNEWCOMMAND";
const newCommands = []; 
const oldCommands = [];

const WEBKIT_PORT = (process.argv[3]);
const PROCESS_PORT = (process.argv[4]);

// Promisify exec for easier use with async/await
const execAsync = promisify(exec);

function notify(message) {
	return new Promise((resolve, reject) => {
		exec(`notify-send "${message}"`, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error sending notification: ${error.message}`);
				reject(error);
			} else {
				console.log(`Notification sent: ${message}`);
				resolve();
			}
		});
	});
}

const server = net.createServer(async (socket) => { 
	console.log('Neovim connected.');
	render.greetViewer(WEBKIT_PORT);

	try {
		const data = await fs.promises.readFile(newcommands_file, 'utf8');
		const lines = data.split('\n');
		lines.forEach(line => {
			const [newAlias, oldAlias] = line.split(delimiter);
			if ((oldAlias && newAlias) && (oldAlias.trim() && oldAlias.trim())) {
				newCommands.push(newAlias.trim());
				oldCommands.push(oldAlias.trim());
			} else {
				console.warn(`Skipping line with unexpected format: ${line}`);
			}
		});

		socket.on('data', async (data) => {
			let processed_line = data.toString();
			processed_line = render.addText(processed_line);
			processed_line = render.expandAliases(processed_line, newCommands, oldCommands);
			processed_line = render.stripMathMode(processed_line);

			render.createHTML(processed_line, WEBKIT_PORT);
		});

		socket.on('end', async () => { 
			try {
				console.log('Neovim disconnected.'); 

				render.terminateViewer(WEBKIT_PORT);

				let { stdout: commOutput } = await execAsync(`bash -c "comm -12 <(xdotool search --name  '${filepath.slice(0,-3)}pdf'  | sort) <(xdotool search --classname 'zathura'  | sort)"`); 
				// await notify(commOutput + " is the one to kill."); // Use stored commOutput 
				let commOutputArray = commOutput.split("\n");
				for (pid of commOutputArray) {
					if (pid && pid.trim()) {
						await execAsync(`bash -c "xdotool windowkill ${pid}"`);
					}
				}

			} catch (error) {
				// await notify(`Error in socket.on('end'): ${error.message}`); 
				console.error(`Error in socket.on('end'): ${error.message}`); 
			}
		}); 

	} catch (err) {
		console.error("Error reading aliases file:", err);
	}
});

server.listen(PROCESS_PORT, () => {
	console.log(`Server listening on port ${PROCESS_PORT}`);
});
