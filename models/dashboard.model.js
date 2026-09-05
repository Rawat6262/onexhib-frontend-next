import axios from "axios";

export const getDashboardStats = () => axios.get("/api/Dashboard");
