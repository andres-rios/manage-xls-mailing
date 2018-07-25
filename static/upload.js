'use strict';
(() => {
  function text(str) {
    const span = document
      .querySelector('#status-upload')
      .appendChild(document.createElement('span'));
    span.innerText = str;
  }

  const setEditable = (col) => (sel) => sel.append('input')
    .classed(col, true)
    .attr('value', d => d[col])
    .on('keyup', (d, i, m) => {
      const e = d3.event;
      const input = m[i];
      if (e.code === 'Enter') {
        d[col] = input.value;
        fetch(`/columns/${d.id}`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            name: d.name,
            synonym: d.synonym
          })
        });
      }
    });

  document.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    text(`uploading...`);
    fetch('/upload', {
      method: 'post',
      body: fd
    }).then(res => res.json()).then(res => {
      text(`uploaded ${res.path}`);
    });
  });

  const showColumns = (e) => {
    fetch('/columns').then(res => res.json()).then(res => {
      document.querySelector('#columns tbody').innerHTML = '';  // fuck!
      const trs = d3.select('#columns tbody').selectAll('tr').data(res);
      const tr = trs.enter().append('tr');
      tr.append('td').call(setEditable('name'));
      tr.append('td').call(setEditable('synonym'));
    });
  };

  showColumns();

  document.querySelector('#check-columns').addEventListener('click', showColumns);
  document.querySelector('#download').addEventListener('click', e => {
    location.href = '/download';
  });
})();
