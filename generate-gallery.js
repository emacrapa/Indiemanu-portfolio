const fs = require("fs");
const path = require("path");

const PROJECTS_JSON = path.join(__dirname, "js", "projects.json");

const data = JSON.parse(
    fs.readFileSync(PROJECTS_JSON, "utf8")
);

function naturalSort(a, b) {
    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base"
    });
}

for (const project of data.projects) {

    if (!project.galleryFolder)
        continue;

    const folder = path.join(
        __dirname,
        project.galleryFolder.replace(/^\//, "")
    );

    if (!fs.existsSync(folder)) {
        console.warn(`Folder missing: ${folder}`);
        continue;
    }

    const images = fs.readdirSync(folder)
        .filter(file => /\.(png|jpe?g|webp)$/i.test(file))
        .sort(naturalSort)
        .map(file => `${project.galleryFolder}/${file}`);

    project.gallery = images;

    console.log(`${project.title}: ${images.length} images`);
}

fs.writeFileSync(
    PROJECTS_JSON,
    JSON.stringify(data, null, 2)
);

console.log("\nprojects.json updated.");