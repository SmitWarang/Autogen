import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function UIExample() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      {/* Header */}
      <motion.h1 
        className="text-4xl font-bold mb-6 text-gray-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🚀 AutoGen Project
      </motion.h1>

      {/* Card */}
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Minimal UI</h2>
          <p className="text-gray-600">This is a clean, modern, minimalistic interface for your project.</p>

          {/* Input */}
          <input
            type="text"
            placeholder="Enter something..."
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          {/* Button */}
          <Button className="w-full rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition">
            Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
