const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000';
const id = process.argv[2];

const url = new URL(`${BASE_URL}/api/jobs/process`);
if (id) url.searchParams.set('id', id);

const res = await fetch(url, { method: 'GET' });
const data = await res.json();

if (res.status === 404) {
  console.log(data.message);
  process.exit(0);
}

if (!res.ok) {
  console.error('Error:', data.error ?? 'Unknown error');
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
