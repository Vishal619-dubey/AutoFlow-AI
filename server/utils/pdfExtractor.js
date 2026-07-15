const fs = require("fs");
const pdf = require("pdf-parse");

const extractPdfText = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);

    const data = await pdf(buffer);

    return data.text;

  } catch (err) {
    console.log(err);

    return "";
  }
};

module.exports = extractPdfText;