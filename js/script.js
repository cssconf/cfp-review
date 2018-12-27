(function () {

  // localStorage warppers
  Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
  };

  Storage.prototype.getObject = function(key) {
    try {
      return JSON.parse(this.getItem(key));
    } catch(e) {
      return {};
    }
  };
  // ---

  // loading/storing votes
  function loadVotes() {
    if(!window.localStorage.getObject(sheetID)) {
      window.localStorage.setObject(sheetID, []);
    }
    return window.localStorage.getObject(sheetID);
  }

  function storeVotes(votes) {
    window.localStorage.setObject(sheetID, votes);
  }
  // ---

  var keyParam = location.href.match(/key=([^&\/]+)/);
  var sheetID;
  if (keyParam) {
    sheetID = keyParam[1];
  } else {
    var sheetUrl = keyParam ? keyParam[1] :
        prompt("Paste URL of CFP response spreadsheet",
            localStorage.getItem('sheetUrl') || '');
    localStorage.setItem('sheetUrl', sheetUrl);
    sheetID = sheetUrl.match(/\/spreadsheets\/d\/([^&]+)\//)[1];
  }
  // restore previous votes into the current vote form
  function loadValues() {
    var votes = loadVotes();
    var rowNo = parseInt($('#sheetRowNumber').val(), 10);
    // load persisted values
    var vote = votes[rowNo];
    if(!vote) {
      return;
    }
    $('#comment').val(vote.comment.replace(/\+/g, ' '));
    $('#vote_' + vote.vote).prop("checked", true);
  }

  function persistVote (e) {

    var form = $('#voter')[0];
    var voteRadio = form.querySelector(':checked');
    var vote = {
      sheetRowNumber: form.sheetRowNumber.value,
      id: form.id.value,
      comment: form.comment.value.replace(/,/g, ';'),
      vote: voteRadio ? voteRadio.value : '',
    };
    var votes = loadVotes();

    votes[vote.sheetRowNumber] = {
      vote: vote.vote,
      comment: vote.comment,
      id: vote.id,
    };
    storeVotes(votes);

    function successCallback () {
      $('body').css({ opacity: 1 });
    }
    $('body').css({ opacity: 0.5 });
    setTimeout(successCallback, 150);
    exportData(e);
    if (document.querySelector('#speed_mode').checked && vote.vote) {
      setTimeout(function() {
        document.querySelector('.pagination-next-fullTable').click();
        window.scrollTo(0,0);
      });
    }
    setTimeout(function() {
      displayStats(votes);
    })
  }

  var totalRows; // ugh global!
  function showInfo(data) {
    totalRows = data.length;
    data = data.map(function (proposal) {
      proposal.summary =
          proposal["presentationsummarytobeusedintheprogram"] ||
          proposal["summary"];
      proposal.extra =
          proposal["whatelsedoyouwanttotellusaboutthetalk"] ||
          proposal["isthereanythingelseyoudlikeustoknowaboutyourtalk"];
      proposal.topicofpresentation = proposal.topicofpresentation || proposal.topic;
      proposal.sheetRowNumber = proposal.rowNumber + 1;
      return proposal;
    })
    var tableOptions = {"data": data
    , "pagination": 1, "tableDiv": "#fullTable", "filterDiv": "#fullTableFilter"}
    Sheetsee.makeTable(tableOptions)
    Sheetsee.initiateTableFilter(tableOptions)
    loadValues();
    $('body').removeClass('loading');
  }

  document.addEventListener('DOMContentLoaded', function() {
    Tabletop.init({
      key: sheetID,
      callback: showInfo,
      simpleSheet: true,
      wanted: ["Form Responses 1"]
    })
  })

  window.addEventListener('keydown', function(e) {
    if (e.target.tagName == 'TEXTAREA') {
      return;
    }
    var key = String.fromCharCode(e.keyCode);
    if (!isNaN(Number(key))) {
      $('#vote_' + key).click();
    }
  })

  // localStorage to csv
  function exportData(e) {
    e.preventDefault();
    var votes = loadVotes();
    var csv = '';
    for(var idx = 0; idx < totalRows; idx++) {
      var vote = votes[idx];
      if(vote) {
        csv += vote.id + ',' + vote.vote + ',' + vote.comment + '\n';
      } else {
        csv += '\n';
      }
    }
    $('#export').val(csv).show();
  }

  function displayStats(votes) {
    const stats = {};
    let total = 0;
    for (let v of Object.values(votes)) {
      if (!v) {
        continue;
      }
      if (!stats[v.vote]) {
        stats[v.vote] = 0;
      }
      stats[v.vote]++;
      total++;
    }
    for (let vote of Object.keys(stats)) {
      const count = stats[vote];
      const percent = Math.round((count / total * 100) / 2 /* to 50 pixels*/);
      console.log(vote, count, percent);
      document.querySelector('#s' + vote + ' span').style.width = percent  +  "px"
    }
  }

  // helper
  function parseVote(s) {
    var vote = {};
    var kvs = s.split('&');
    kvs.forEach(function(kv) {
      var k_v = kv.split('=');
      var key = k_v[0];
      var value = k_v[1];
      if(key != 'comment' && key != 'id') {
        value = parseInt(value, 10);
      }
      vote[k_v[0]] = value;
    });
    return vote;
  }

  $('.content').on('change', 'form input', persistVote);
  $('.content').on('blur', 'form textarea', persistVote)
  $('#export-link').on('click', exportData);
  $(window).on('hashchange', loadValues);
}());
