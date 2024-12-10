const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" })); // Memungkinkan upload data besar

const ugu = async (fileBuffer) => {
	try {
		const { mime, ext } = await fromBuffer(fileBuffer);

		const formData = new FormData();
		formData.append("files[]", fileBuffer, {
			filename: `file.${ext}`,
			contentType: mime
		});

		const response = await axios.post("https://uguu.se/upload", formData, {
			headers: {
				...formData.getHeaders()
			}
		});

		return response.data.files[0].url;
	} catch (error) {
		console.error("Upload failed:", error);
		throw error;
	}
};

app.post("/upload", async (req, res) => {
	const { imageBase64, filename } = req.body;
	console.log("Request masuk: ", { size: imageBase64.length, filename: filename });
	if (!imageBase64 || !filename) {
		return res.status(400).json({ error: "Image or filename is missing." });
	}

	const uploadPath = path.join(__dirname, "public", "uploads", filename);

	try {
		// Konversi base64 menjadi buffer dan simpan ke file
		const buffer = Buffer.from(imageBase64, "base64");
		fs.writeFileSync(uploadPath, buffer);

		const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
		let imageUrl = await ugu(buffer);
		let result = {
			message: "File uploaded successfully",
			url: fileUrl,
			image: imageUrl,
			fileDetails: {
				originalName: filename,
				size: buffer.length,
				path: uploadPath
			}
		};
		console.log(result)

		res.json(result);

		// Hapus file setelah berhasil diproses
		fs.unlink(uploadPath, (err) => {
			if (err) {
				console.error(`Error deleting file: ${uploadPath}`, err);
			} else {
				console.log(`File deleted: ${uploadPath}`);
			}
		});
	} catch (error) {
		console.error("Error processing upload:", error);
		res.status(500).json({ error: "Failed to upload file." });
	}
});

app.listen(8080, () => {
	console.log("Server running on port 8080");
});
