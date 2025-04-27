import SunaAgent from '@/components/suna-agent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JARVIS - AI Agent',
  description: 'Powerful AI agent capabilities powered by Suna integration',
};

export default function AgentPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Agent</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Leverage powerful AI agent capabilities to accomplish complex tasks, web automation, and more.
        </p>
      </div>
      
      <SunaAgent />
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">About Suna Integration</h2>
        <p className="mb-2">
          This agent is powered by Suna's advanced capabilities, seamlessly integrated with JARVIS.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Web automation and browsing</li>
          <li>File management and document creation</li>
          <li>Data extraction and analysis</li>
          <li>Command-line execution</li>
          <li>API integrations</li>
        </ul>
      </div>
    </div>
  );
}