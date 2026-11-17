const pool = require("../config/db");

const SETTING_KEYS = [
  "child_ticket_discount_percent",
  "loyalty_ticket_discount_percent",
];

async function getTicketDiscounts(req, res) {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value
       FROM system_settings
       WHERE setting_key = ANY($1::text[])`,
      [SETTING_KEYS]
    );

    const values = Object.fromEntries(
      result.rows.map((row) => [row.setting_key, Number(row.setting_value)])
    );

    return res.status(200).json({
      child_ticket_discount_percent: values.child_ticket_discount_percent ?? 50,
      loyalty_ticket_discount_percent: values.loyalty_ticket_discount_percent ?? 50,
    });
  } catch (error) {
    console.error("Get ticket discounts error:", error);
    return res.status(500).json({ message: "Unable to retrieve ticket discounts." });
  }
}

async function updateTicketDiscounts(req, res) {
  const child = req.body?.child_ticket_discount_percent;
  const loyalty = req.body?.loyalty_ticket_discount_percent;

  const isValidPercent = (value) =>
    Number.isInteger(value) && value >= 0 && value <= 100;

  if (!isValidPercent(child) || !isValidPercent(loyalty)) {
    return res.status(400).json({
      message: "Both discount percentages must be whole numbers between 0 and 100.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)\n       VALUES\n         ('child_ticket_discount_percent', $1, NOW()),\n         ('loyalty_ticket_discount_percent', $2, NOW())\n       ON CONFLICT (setting_key)\n       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [child, loyalty]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Ticket discount settings updated successfully.",
      child_ticket_discount_percent: child,
      loyalty_ticket_discount_percent: loyalty,
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("Ticket discount rollback error:", rollbackError);
    }
    console.error("Update ticket discounts error:", error);
    return res.status(500).json({ message: "Unable to update ticket discounts." });
  } finally {
    client.release();
  }
}

module.exports = { getTicketDiscounts, updateTicketDiscounts };
