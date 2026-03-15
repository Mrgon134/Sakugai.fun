export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  style: string;
  aspectRatio: string;
  model: string;
}

export interface GenerateVideoParams {
  prompt: string;
  style: string;
  aspectRatio: string;
  model: string;
  onProgress?: (info: { queuePosition?: number; falStatus?: string }) => void;
}

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const BASE_URL = `${SUPABASE_URL}/functions/v1/generate`;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error: ${text.substring(0, 200)}`);
  }
}

export async function generateImage(params: GenerateImageParams): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'image',
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      style: params.style,
      aspectRatio: params.aspectRatio,
      model: params.model,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'Image generation failed');
  }

  if (!data.url) {
    throw new Error('No image URL returned from server');
  }

  return data.url;
}

async function pollVideoStatus(
  statusUrl: string,
  responseUrl: string,
  onProgress?: (info: { queuePosition?: number; falStatus?: string }) => void
): Promise<string> {
  const maxAttempts = 180;
  const interval = 5000;
  const maxNetworkRetries = 3;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));

    let data: any = null;
    let response: Response | null = null;
    let networkErrorCount = 0;

    while (networkErrorCount <= maxNetworkRetries) {
      try {
        response = await fetch(BASE_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'video_status', status_url: statusUrl, response_url: responseUrl }),
        });
        data = await parseResponse(response);
        break;
      } catch {
        networkErrorCount++;
        if (networkErrorCount > maxNetworkRetries) {
          throw new Error('Network error while checking video status. Please check your connection.');
        }
        await new Promise((r) => setTimeout(r, 3000 * networkErrorCount));
      }
    }

    if (!response || !data) continue;

    if (!response.ok) {
      throw new Error(data.error || 'Failed to check video status');
    }

    if (data.status === 'completed' && data.url) {
      return data.url;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Video generation failed on fal.ai');
    }

    if (onProgress) {
      onProgress({ queuePosition: data.queue_position, falStatus: data.fal_status });
    }
  }

  throw new Error('Video generation timed out after 15 minutes. Please try again.');
}

export async function generateVideo(params: GenerateVideoParams): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'video',
      prompt: params.prompt,
      style: params.style,
      aspectRatio: params.aspectRatio,
      model: params.model,
    }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'Video generation failed');
  }

  if (data.url) {
    return data.url;
  }

  if (data.request_id && data.status_url && data.response_url) {
    return pollVideoStatus(data.status_url, data.response_url, params.onProgress);
  }

  throw new Error('Unexpected response from server');
}
