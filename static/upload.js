'use strict';
(() => {
  function text(str) {
    const span = document
      .querySelector('#status-upload')
      .appendChild(document.createElement('span'));
    span.innerText = str;
  }

  function updateTableColumn(d) {
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

  function updateTableVideo(d) {
    fetch(`/videos/${d.id}`, {
      method: 'put',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        name: d.name,
        url: d.url
      })
    });
  }

  function updateTableManageNames(d, i, m) {
    console.log(d, i, m);
    const tosend = {};
    let j = 0;
    if (d.name) {
      tosend.name = d.name;
      j++;
    }
    if (d.url) {
      tosend.url = d.url;
      j++;
    }
    if (j) {
    fetch(`/manage_names/${d.first_name}`, {
      method: 'put',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(tosend)
    });
    }
  }

  const setEditable = (col,
    updateFn = (() => {})) => (sel) => sel.append('input')
    .classed(col, true)
    .attr('value', d => d[col])
    .on('keyup', (d, i, m) => {
      const e = d3.event;
      const input = m[i];
      if (e.code === 'Enter') {
        d[col] = input.value;
        updateFn(d, i, m);
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
      tr.append('td').call(setEditable('name', updateTableColumn));
      tr.append('td').call(setEditable('synonym', updateTableColumn));
    });
  };
  showColumns();

  const showVideos = (e) => {
    fetch('/videos').then(res => res.json()).then(res => {
      document.querySelector('#videos tbody').innerHTML = '';  // fuck!
      const trs = d3.select('#videos tbody').selectAll('tr').data(res);
      const tr = trs.enter().append('tr');
      tr.append('td').call(setEditable('name', updateTableVideo));
      tr.append('td').call(setEditable('url', updateTableVideo));
    });
  };
  showVideos();

  const showManageNames = (e) => {
    fetch('/manage_names').then(res => res.json()).then(res => {
      document.querySelector('#manage_names tbody').innerHTML = '';  // fuck!
      const trs = d3.select('#manage_names tbody').selectAll('tr').data(res);
      const tr = trs.enter().append('tr');
      tr.append('td').append('span').text(d => d.c_first_name);
      tr.append('td').append('span').text(d => d.first_name);
      tr.append('td').call(setEditable('name', updateTableManageNames));
      tr.append('td').call(setEditable('url', updateTableManageNames));
    });
  };
  showManageNames();

  document.querySelector('#check-columns').addEventListener('click', showColumns);
  document.querySelector('#check-videos').addEventListener('click', showVideos);
  document.querySelector('#check-manage_names').addEventListener('click', showManageNames);
  document.querySelector('#download').addEventListener('click', e => {
    location.href = '/download';
  });
})();
