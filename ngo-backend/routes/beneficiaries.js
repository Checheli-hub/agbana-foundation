import express from "express";
import Beneficiary from "../models/Beneficiary.js";

const router = express.Router();

const formatBeneficiary = (beneficiary) => {
  const fullName =
    beneficiary.fullName ||
    beneficiary.name ||
    beneficiary["Full Name"] ||
    beneficiary["Name"] ||
    beneficiary["full name"] ||
    "";

  const phone =
    beneficiary.phone ||
    beneficiary["Phone Number"] ||
    beneficiary["Phone"] ||
    beneficiary["phone number"] ||
    "";

  const category =
    beneficiary.category ||
    beneficiary.Category ||
    beneficiary["Category"] ||
    "Past Beneficiary";

  return {
    id: beneficiary._id.toString(),
    fullName,
    phone,
    passport: beneficiary.passport || beneficiary["Passport"] || "",
    category,
    empowermentType:
      beneficiary.empowermentType ||
      beneficiary["Empowerment Type"] ||
      beneficiary["Empowerment"] ||
      "",
    dateAdded:
      beneficiary.dateAdded ||
      beneficiary["Date Added"] ||
      new Date().toISOString().slice(0, 10),
    called:
      typeof beneficiary.called === "boolean"
        ? beneficiary.called
        : String(beneficiary.called || "")
            .toLowerCase()
            .startsWith("y"),
    calledAt: beneficiary.calledAt || beneficiary["Date Called"] || "",
  };
};

// GET /beneficiaries
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const total = await Beneficiary.countDocuments();
    const beneficiaries = await Beneficiary.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      beneficiaries: beneficiaries.map(formatBeneficiary),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /beneficiaries/:id
router.get("/:id", async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found." });
    }
    res.json(formatBeneficiary(beneficiary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /beneficiaries
router.post("/", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      passport,
      category,
      empowermentType,
      dateAdded,
      called,
      calledAt,
      // status and notes are intentionally ignored on create per request
    } = req.body;

    if (!fullName || !phone || !dateAdded) {
      return res.status(400).json({
        error: "Full name, phone, and date added are required.",
      });
    }

    const newBeneficiary = new Beneficiary({
      fullName,
      phone,
      passport,
      category: category || "New Beneficiary",
      empowermentType,
      dateAdded,
      called: called || false,
      calledAt: calledAt || "",
      // keep schema defaults for status and notes
    });

    await newBeneficiary.save();
    res.status(201).json(formatBeneficiary(newBeneficiary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /beneficiaries/import
router.post("/import", async (req, res) => {
  try {
    const imported = Array.isArray(req.body) ? req.body : [];

    if (!imported.length) {
      return res
        .status(400)
        .json({ error: "Import payload must be an array." });
    }

    const beneficiariesToCreate = imported.map((item) => {
      const fullName =
        item.fullName ||
        item.name ||
        item["Full Name"] ||
        item["Name"] ||
        item["full name"] ||
        "";

      const phone =
        item.phone ||
        item["Phone Number"] ||
        item["Phone"] ||
        item["phone number"] ||
        "";

      return {
        fullName,
        phone,
        passport: item.passport || item["Passport"] || "",
        category: "Past Beneficiary",
        empowermentType:
          item.empowermentType ||
          item["Empowerment Type"] ||
          item["Empowerment"] ||
          "",
        dateAdded:
          item.dateAdded ||
          item["Date Added"] ||
          new Date().toISOString().slice(0, 10),
        called:
          typeof item.called === "boolean"
            ? item.called
            : String(item.called || "")
                .toLowerCase()
                .startsWith("y"),
        calledAt: item.calledAt || item["Date Called"] || "",
      };
    });

    const created = await Beneficiary.insertMany(beneficiariesToCreate);
    res.status(201).json(created.map(formatBeneficiary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /beneficiaries/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      passport,
      category,
      empowermentType,
      dateAdded,
      called,
      calledAt,
      // status and notes ignored on update via this endpoint
    } = req.body;

    const update = {
      fullName,
      phone,
      passport,
      category,
      empowermentType,
      dateAdded,
      called,
      calledAt,
      // leave status and notes unchanged here
    };

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    );

    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found." });
    }

    res.json(formatBeneficiary(beneficiary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /beneficiaries/:id
router.delete("/:id", async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);

    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found." });
    }

    res.json({ message: "Beneficiary deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /beneficiaries/batch/delete - Batch delete beneficiaries
router.post("/batch/delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array." });
    }

    const result = await Beneficiary.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      message: `Deleted ${result.deletedCount} beneficiaries.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /beneficiaries/batch/status - Batch update status
router.post("/batch/status", async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array." });
    }

    if (!["Active", "Inactive", "Closed"].includes(status)) {
      return res.status(400).json({
        error: 'status must be "Active", "Inactive", or "Closed".',
      });
    }

    const result = await Beneficiary.updateMany(
      { _id: { $in: ids } },
      { status },
      { runValidators: true },
    );

    res.json({
      message: `Updated ${result.modifiedCount} beneficiaries.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /beneficiaries/search - Search with filters
router.get("/search/query", async (req, res) => {
  try {
    const { query, status, category, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (query) {
      filter.$or = [
        { fullName: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ];
    }

    if (status && ["Active", "Inactive", "Closed"].includes(status)) {
      filter.status = status;
    }

    if (
      category &&
      ["New Beneficiary", "Past Beneficiary"].includes(category)
    ) {
      filter.category = category;
    }

    const total = await Beneficiary.countDocuments(filter);
    const beneficiaries = await Beneficiary.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      beneficiaries: beneficiaries.map(formatBeneficiary),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
