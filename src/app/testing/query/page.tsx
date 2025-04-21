"use client";

import QueryTester from "@/components/testing/query-tester";

export default function TestingPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-8">Contract Query Testing Page</h1>
      <QueryTester />
    </div>
  );
}
