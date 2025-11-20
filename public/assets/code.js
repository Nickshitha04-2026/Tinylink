// parse code from url /code/:code -> page should be /code.html?code=XXXX
(function () {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');

  if (!code) {
    document.getElementById('loading').innerText =
      'No code provided in query string.';
    return;
  }

  fetch(`/api/links/${code}`)
    .then((r) => {
      if (r.status === 404) throw new Error('Not found');
      return r.json();
    })
    .then((data) => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('stats').style.display = 'block';

      document.getElementById('codeTitle').innerText = data.code;

      const link = document.getElementById('targetLink');
      link.href = data.target_url;
      link.innerText = data.target_url;

      document.getElementById('clicks').innerText = data.clicks;
      document.getElementById('created').innerText = new Date(
        data.created_at
      ).toLocaleString();

      document.getElementById('last').innerText = data.last_clicked
        ? new Date(data.last_clicked).toLocaleString()
        : 'Never';
    })
    .catch(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('notfound').style.display = 'block';
    });
})();
