const Fs      = require('fs');
const Path    = require('path');
const { app } = require('electron')

function GetRegistryFname() {
    return Path.join(app.getPath('userData'), 'registry.json');
}

export default {

    getDocumentTree: () => {
        const fname = GetRegistryFname();
        let response = [];

        if (Fs.existsSync(fname)) {
            response = JSON.parse(Fs.readFileSync(fname).toString());
        }

        return response;
    }

}