import fs from 'fs';

// Specify the path to your file
// filePath = './path_to_your_file/filename.txt';

export async function readFile(filePath) {


    console.log('Reading file...', filePath);
    
    
    // Read the file asynchronously
    return Bun.file(filePath, (err, data) => {
        console.log('File content:', data);
        if (err) {
            console.error(`Error reading file: ${err}`);
            return;
        }
    
        // Create a Blob from the file content
        const blob = new Blob([data], { type: 'text/plain' });
    
        // Convert the Blob to a File object
        const fileObject = new File([blob], filePath);
    
        console.log('File Object:');
        console.log(fileObject);
    });
}
