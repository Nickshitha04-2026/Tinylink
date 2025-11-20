// public/assets/main.js
const API = '/api/links';
const linksBody = document.getElementById('linksBody');
const emptyState = document.getElementById('emptyState');
const submitBtn = document.getElementById('submitBtn');
const formMsg = document.getElementById('formMsg');

async function fetchLinks() {
  const res = await fetch(API);
  const data = await res.json();
  return data;
}

function renderRows(links) {
  linksBody.innerHTML = '';
  if (!links.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  for (const l of links) {
    const tr = document.createElement('tr');
    const codeCell = `<td><a href="/${l.code}" target="_blank">${l.code}</a></td>`;
    const targetCell = `<td title="${l.target_url}">${truncate(l.target_url, 60)}</td>`;
    const clicks = `<td>${l.clicks}</td>`;
    const last = `<td>${l.last_clicked ? new Date(l.last_clicked).toLocaleString() : 'Never'}</td>`;
    const actions = `<td>
      <a href="/code.html?code=${encodeURIComponent(l.code)}">Stats</a>
      <button data-code="${l.code}" class="delBtn">Delete</button>
    </td>`;
    tr.innerHTML = codeCell + targetCell + clicks + last + actions;
    linksBody.appendChild(tr);
  }
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n-1) + '…' : s;
}

document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.innerText = '';
  submitBtn.disabled = true;
  const target_url = document.getElementById('target_url').value.trim();
  const code = document.getElementById('code').value.trim();
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_url, code: code || undefined })
    });
    if (res.status === 201) {
      formMsg.innerText = 'Created!';
      document.getElementById('createForm').reset();
      loadAndRender();
    } else if (res.status === 409) {
      const body = await res.json();
      formMsg.innerText = body.error || 'Duplicate code';
    } else {
      const body = await res.json();
      formMsg.innerText = body.error || 'Error';
    }
  } catch (err) {
    formMsg.innerText = 'Network error';
  } finally {
    submitBtn.disabled = false;
    setTimeout(()=>formMsg.innerText='', 3000);
  }
});

document.getElementById('linksTable').addEventListener('click', async (e) => {
  if (e.target.classList.contains('delBtn')) {
    const code = e.target.dataset.code;
    if (!confirm(`Delete ${code}?`)) return;
    try {
      const res = await fetch(`/api/links/${code}`, { method: 'DELETE' });
      if (res.status === 204) {
        loadAndRender();
      } else {
        alert('Delete failed');
      }
    } catch (err) {
      alert('Network error');
    }
  }
});

document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  Array.from(linksBody.rows).forEach(row => {
    const txt = row.innerText.toLowerCase();
    row.style.display = txt.includes(q) ? '' : 'none';
  });
});

async function loadAndRender() {
  const links = await fetchLinks();
  renderRows(links);
}

loadAndRender();
