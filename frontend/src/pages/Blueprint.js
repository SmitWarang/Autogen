// frontend/src/pages/Blueprint.js
import React, { useEffect, useMemo, useState } from "react";
// near the top of src/pages/Blueprint.js
import "../styles/theme.css";
import "../styles/blueprint.css";


import {
  getSubjects,
  getPoolMetadataForBlueprint,
  createBlueprint,
  getBlueprints,
  validateBlueprint,
} from "../services/api";

function toInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

export default function Blueprint() {
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(20);
  const [numberOfPapers, setNumberOfPapers] = useState(1);

  const [meta, setMeta] = useState(null);
  const [distributionMarks, setDistributionMarks] = useState({});
  const [distributionRbt, setDistributionRbt] = useState({});
  const [distributionType, setDistributionType] = useState({});
  const [existing, setExisting] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // load subjects
    getSubjects().then((res) => {
      const s = res.subjects || [];
      setSubjects(s);
    });
    // load existing blueprints
    getBlueprints().then((res) => setExisting(res || []));
  }, []);

  useEffect(() => {
    if (!subject) {
      setMeta(null);
      setDistributionMarks({});
      setDistributionRbt({});
      setDistributionType({});
      return;
    }
    (async () => {
      try {
        setStatus("Loading pool metadata...");
        const res = await getPoolMetadataForBlueprint(subject);
        const m = res.meta || {};
        setMeta(m);

        // init distributions
        const dm = {};
        const dr = {};
        const dt = {};
        (m.modules || []).forEach((mod) => {
          dm[mod] = {};
          dr[mod] = {};
          dt[mod] = {};
          (m.marksValues || []).forEach((mk) => (dm[mod][mk] = 0));
          (m.rbtLevels || []).forEach((r) => (dr[mod][r] = 0));
          (m.types || []).forEach((t) => (dt[mod][t] = 0));
        });

        setDistributionMarks(dm);
        setDistributionRbt(dr);
        setDistributionType(dt);
      } catch (err) {
        console.error(err);
        setStatus(err.message || "Failed to load metadata");
      } finally {
        setStatus("");
      }
    })();
  }, [subject]);

  const totals = useMemo(() => {
    let q = 0, m = 0;
    for (const mod of Object.keys(distributionMarks || {})) {
      for (const mk of Object.keys(distributionMarks[mod] || {})) {
        const cnt = toInt(distributionMarks[mod][mk], 0);
        q += cnt;
        m += cnt * toInt(mk, 0);
      }
    }
    return { totalQuestions: q, totalMarks: m };
  }, [distributionMarks]);

  const onChangeMarksCell = (mod, mk, val, maxAvail) => {
    const n = Math.max(0, toInt(val, 0));
    const clamped = maxAvail != null && n > maxAvail ? maxAvail : n;
    setDistributionMarks((prev) => ({ ...prev, [mod]: { ...(prev[mod] || {}), [mk]: clamped } }));
  };

  const onChangeRbtCell = (mod, r, val, maxAvail) => {
    const n = Math.max(0, toInt(val, 0));
    const clamped = maxAvail != null && n > maxAvail ? maxAvail : n;
    setDistributionRbt((prev) => ({ ...prev, [mod]: { ...(prev[mod] || {}), [r]: clamped } }));
  };

  const onChangeTypeCell = (mod, t, val, maxAvail) => {
    const n = Math.max(0, toInt(val, 0));
    const clamped = maxAvail != null && n > maxAvail ? maxAvail : n;
    setDistributionType((prev) => ({ ...prev, [mod]: { ...(prev[mod] || {}), [t]: clamped } }));
  };

  const handleCreate = async () => {
    if (!title.trim()) return alert("Enter blueprint name");
    if (!subject) return alert("Select subject");

    if (totals.totalMarks !== toInt(totalMarks, 0)) {
      return alert(`Distribution marks ${totals.totalMarks} must equal Total Marks ${toInt(totalMarks, 0)}`);
    }

    // Build distribution structure required by backend (module -> {marks: count})
    // We only use distributionMarks for actual generation. RBT and Type grids can be stored for informational use.
    const distribution = distributionMarks;

    try {
      setStatus("Creating blueprint...");
      const payload = {
        title: title.trim(),
        subject,
        totalMarks: toInt(totalMarks, 0),
        numberOfPapers: toInt(numberOfPapers, 1),
        distribution,
      };
      const created = await createBlueprint(payload);
      setStatus("Blueprint created");
      const list = await getBlueprints();
      setExisting(list || []);
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Failed to create blueprint");
      if (err?.response?.data?.details) {
        alert("Feasibility errors:\n" + err.response.data.details.join("\n"));
      }
    }
  };

  const handleValidate = async (id) => {
    try {
      const res = await validateBlueprint(id);
      if (res.valid) alert("Blueprint is valid");
      else alert("Blueprint invalid:\n" + (res.details || []).join("\n"));
    } catch (e) {
      alert(e.message || "Validation failed");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "32px auto", padding: 16 }}>
      <h2>Create Blueprint</h2>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
        <input placeholder="Blueprint Name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Select Subject</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Distribution (Module × Marks)</h3>
        {!meta ? <p>Select subject to load pool metadata</p> : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Module</th>
                    {(meta.marksValues || []).map((mk) => (
                      <th key={mk} style={{ padding: 8, borderBottom: "1px solid #ddd" }}>{mk} Marks</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(meta.modules || []).map((mod) => (
                    <tr key={mod}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>CO{mod}</td>
                      {(meta.marksValues || []).map((mk) => {
                        const avail = meta.availability?.[mod]?.[mk] || 0;
                        const val = (distributionMarks?.[mod]?.[mk]) ?? 0;
                        return (
                          <td key={mk} style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
                            <input type="number" min={0} value={val} onChange={(e) => onChangeMarksCell(mod, mk, e.target.value, avail)} style={{ width: 80 }} />
                            <div style={{ fontSize: 12, color: "#666" }}>avail: {avail}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ padding: 8, fontWeight: "bold" }}>Totals</td>
                    <td colSpan={(meta.marksValues || []).length} style={{ padding: 8 }}>
                      Questions: <b>{totals.totalQuestions}</b> &nbsp; | &nbsp; Marks: <b>{totals.totalMarks}</b>
                      {totals.totalMarks !== toInt(totalMarks) ? <span style={{ color: "crimson" }}> (must equal {toInt(totalMarks)})</span> : <span style={{ color: "green" }}> (OK)</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <h3 style={{ marginTop: 20 }}>Distribution (Module × RBT)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Module</th>
                    {(meta.rbtLevels || []).map((r) => <th key={r} style={{ padding: 8 }}>{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(meta.modules || []).map((mod) => (
                    <tr key={mod}>
                      <td style={{ padding: 8 }}>CO{mod}</td>
                      {(meta.rbtLevels || []).map((r) => {
                        const avail = meta.availabilityRbt?.[mod]?.[r] || 0;
                        const val = distributionRbt?.[mod]?.[r] ?? 0;
                        return (
                          <td key={r} style={{ padding: 8, textAlign: "center" }}>
                            <input type="number" value={val} onChange={(e) => onChangeRbtCell(mod, r, e.target.value, avail)} style={{ width: 80 }} />
                            <div style={{ fontSize: 12, color: "#666" }}>avail: {avail}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginTop: 20 }}>Distribution (Module × Type)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Module</th>
                    {(meta.types || []).map((t) => <th key={t} style={{ padding: 8 }}>{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(meta.modules || []).map((mod) => (
                    <tr key={mod}>
                      <td style={{ padding: 8 }}>CO{mod}</td>
                      {(meta.types || []).map((t) => {
                        const avail = meta.availabilityType?.[mod]?.[t] || 0;
                        const val = distributionType?.[mod]?.[t] ?? 0;
                        return (
                          <td key={t} style={{ padding: 8, textAlign: "center" }}>
                            <input type="number" value={val} onChange={(e) => onChangeTypeCell(mod, t, e.target.value, avail)} style={{ width: 80 }} />
                            <div style={{ fontSize: 12, color: "#666" }}>avail: {avail}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={handleCreate}>Create Blueprint</button>
        <span style={{ marginLeft: 12 }}>{status}</span>
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Existing Blueprints</h3>
        {!existing.length ? <p>No blueprints yet</p> : (
          <ul>
            {existing.map((bp) => (
              <li key={bp._id}>
                <b>{bp.title}</b> — {bp.subject} — Marks: {bp.totalMarks} — Qs: {bp.totalQuestions}
                <button style={{ marginLeft: 8 }} onClick={() => handleValidate(bp._id)}>Validate</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
