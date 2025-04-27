/**
 * Suna XML Adapter
 * 
 * This module provides utilities for adapting Suna's agent responses to XML format
 * for seamless integration with JARVIS's voice-first interface.
 */

import { XMLBuilder, XMLParser } from 'fast-xml-parser';

// XML parsing options
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true
};

// XML building options
const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true
};

// Initialize parser and builder
const parser = new XMLParser(parserOptions);
const builder = new XMLBuilder(builderOptions);

/**
 * Convert Suna's agent response to XML format for JARVIS
 */
export function convertToXml(response: any): string {
  // Create XML structure
  const xmlObj = {
    response: {
      '@_type': 'agent',
      '@_source': 'suna',
      content: response.text || '',
      metadata: {
        taskId: response.taskId || '',
        status: response.status || '',
        timestamp: new Date().toISOString()
      }
    }
  };

  // Convert to XML string
  return builder.build(xmlObj);
}

/**
 * Parse XML response from JARVIS to Suna format
 */
export function parseFromXml(xml: string): any {
  try {
    // Parse XML string
    const parsed = parser.parse(xml);
    
    // Extract response data
    const response = parsed.response || {};
    const content = response.content || '';
    const metadata = response.metadata || {};
    
    // Return in Suna-compatible format
    return {
      text: content,
      taskId: metadata.taskId,
      status: metadata.status,
      timestamp: metadata.timestamp
    };
  } catch (error) {
    console.error('Error parsing XML response:', error);
    return { text: 'Error parsing response', error: String(error) };
  }
}

/**
 * Format query for Suna agent in XML format
 */
export function formatQueryXml(query: string, options: any = {}): string {
  // Create XML structure
  const xmlObj = {
    query: {
      '@_type': 'agent',
      '@_target': 'suna',
      content: query,
      options: {
        model: options.model || 'groq/llama3-70b-8192',
        stream: options.stream !== undefined ? options.stream : true,
        reasoning: options.reasoning || 'low'
      }
    }
  };

  // Convert to XML string
  return builder.build(xmlObj);
}