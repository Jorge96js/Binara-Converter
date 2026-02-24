export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const videoResponse = await fetch(url);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const contentType = videoResponse.headers.get('content-type');
    const buffer = await videoResponse.arrayBuffer();

    // Importante: Estas cabeceras permiten que el video se use en un entorno 
    // con Cross-Origin-Embedder-Policy: require-corp
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType || 'video/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Error fetching the video. Make sure the URL is correct and public.' });
  }
}
