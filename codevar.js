const express = require('express');
const Datastore = require('nedb');
const crypto = require('crypto');
const path = require('path');
const app = express();

const SECRET_SALT = "VAR_PRO_HOMESTECH_2026"; 
const db = new Datastore({ filename: path.join(__dirname, 'database/keys.db'), autoload: true });

app.use(express.json());
app.use(express.static('public'));

// Hàm tạo mã bản quyền (giữ nguyên logic gốc của bạn)
function generateLicense(hwid, days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    
    const y = futureDate.getFullYear();
    const m = String(futureDate.getMonth() + 1).padStart(2, '0');
    const d = String(futureDate.getDate()).padStart(2, '0');
    const expiryStr = `${y}${m}${d}`;
    
    const checksum = crypto.createHash('md5').update(hwid + expiryStr + SECRET_SALT).digest('hex').substring(0, 8);
    const rawContent = `${hwid}|${expiryStr}|${checksum}`;
    
    return {
        licenseText: Buffer.from(rawContent).toString('base64'),
        expiry: `${d}/${m}/${y}`
    };
}

// API: Tạo License (Giữ nguyên, chỉ thêm kiểm tra lỗi)
app.post('/api/generate-license', (req, res) => {
    const { hwid, days, customerName, phone, price } = req.body;
    
    if (!hwid) return res.status(400).send("Thiếu HWID");

    const result = generateLicense(hwid, days || 30);
    
    const newDoc = {
        customer: customerName || "Khách lẻ",
        phone: phone || "---",      
        price: Number(price) || 0, 
        hwid: hwid,
        license: result.licenseText,
        expiry: result.expiry,
        createdAt: new Date().toISOString()
    };

    db.insert(newDoc, (err, doc) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(doc);
    });
});

// API: Lấy danh sách (Giữ nguyên)
app.get('/api/licenses', (req, res) => {
    db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(docs);
    });
});

// --- BỔ SUNG CÁC PHẦN DƯỚI ĐÂY ---

// API: XÓA LICENSE
app.delete('/api/delete-license/:id', (req, res) => {
    db.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Đã xóa thành công" });
    });
});

// API: CẬP NHẬT LICENSE (SỬA)
app.put('/api/update-license/:id', (req, res) => {
    const { hwid, days, customerName, phone, price } = req.body;
    
    // Tạo lại license mới dựa trên thông tin cập nhật (hwid hoặc số ngày mới)
    const result = generateLicense(hwid, days || 30);
    
    const updateData = {
        customer: customerName,
        phone: phone,
        price: Number(price),
        hwid: hwid,
        license: result.licenseText,
        expiry: result.expiry
    };

    db.update({ _id: req.params.id }, { $set: updateData }, {}, (err, numReplaced) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Đã cập nhật thành công" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server CODEVAR đang chạy trên cổng ${PORT}`));
