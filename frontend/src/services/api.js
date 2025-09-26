// src/services/api.js - Updated for PDF download
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ✅ Keep interceptor for normal JSON APIs
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message =
      error?.response?.data?.message ||
      (error?.response && JSON.stringify(error.response.data)) ||
      error.message ||
      "An unknown API error occurred";
    return Promise.reject({ ...error, message });
  }
);

/* Helpers */
export const buildUploadFormData = (file, subject, moduleVal) => {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (subject) fd.append("subject", subject);
  if (moduleVal) fd.append("module", moduleVal);
  return fd;
};

/* Upload APIs */
export const uploadQuestions = (arg1, arg2, arg3) => {
  let formData;
  if (typeof FormData !== "undefined" && arg1 instanceof FormData) {
    formData = arg1;
    if (arg2) formData.set("subject", arg2);
    if (arg3) formData.set("module", arg3);
  } else if (arg1 && typeof arg1 === "object" && "file" in arg1) {
    const { file, subject, module } = arg1;
    formData = buildUploadFormData(file, subject, module);
  } else {
    const file = arg1,
      subject = arg2,
      moduleVal = arg3;
    formData = buildUploadFormData(file, subject, moduleVal);
  }
  return api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/* Questions / Pool */
export const getSubjects = () => api.get("/questions/subjects");

/* Blueprint APIs */
export const getPoolMetadataForBlueprint = (subject) =>
  api.get(`/blueprints/pool-metadata?subject=${encodeURIComponent(subject)}`);

export const createBlueprint = (payload) => api.post("/blueprints", payload);
export const updateBlueprint = (id, payload) =>
  api.put(`/blueprints/${id}`, payload);
export const getBlueprints = () => api.get("/blueprints");
export const getBlueprintById = (id) => api.get(`/blueprints/${id}`);
export const validateBlueprint = (id) => api.post(`/blueprints/${id}/validate`);

/* Paper APIs */
export const generatePapers = (payload) =>
  api.post("/papers/generate", payload);
export const getPaperById = (id) => api.get(`/papers/${id}`);
export const getRecentPapers = (limit = 10) =>
  api.get(`/papers/recent?limit=${limit}`);

// ✅ UPDATED: Download PDF file (changed from downloadPaperDocx)
export const downloadPaperPDF = async (id) => {
  const rawAxios = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
  const response = await rawAxios.get(`/papers/${id}/download-pdf`, {
    responseType: "blob",
    headers: {
      Accept: "application/pdf",
    },
  });
  return response.data; // returns PDF Blob directly
};

// ✅ LEGACY: Keep the old function name for backward compatibility
export const downloadPaperDocx = downloadPaperPDF;

/* Dashboard */
export const getDashboardStats = () => api.get("/dashboard/stats");

export const getQuestionStats = (subject) => {
  const params = subject ? `?subject=${subject}` : "";
  return api.get(`/questions/stats${params}`);
};

export default api;
