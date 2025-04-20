"use strict";
(function() {
  window.addEventListener("load", init);

  /** Page load functionality */
  function init() {
    let form = document.querySelector("form");
    let hasFilledOut = window.localStorage.getItem("--hekateneocities-filledoutfriendform");

    console.log(hasFilledOut);

    if (hasFilledOut === "true") {
      clearForm(form);
    } else {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        formFunctionality(this);
      });
    }
    
    
  }

  /** Send a 'friend request' to hekate */
  async function formFunctionality(form) {
    try {
      let params = new FormData(form);
      let res = await fetch(`/friends`, {
        method: "POST",
        body: params
      });

      await statusCheck(res);

      clearForm(form);
      window.localStorage.setItem("--hekateneocities-filledoutfriendform", "true");

    } catch (err) {
      console.error(err);
      alert('Blah.  Something went wrong.  Tell hekate.');
    }
  }

  function clearForm(formElem) {
    formElem.innerHTML = "";
      
    let successMessage = document.createElement("p");
    successMessage.textContent = "THANK U FOR FILLING OUT MY FRIEND FORM!  I'm excited to chat with u :-)";

    formElem.appendChild(successMessage);
  }

  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }

    return res;
  }
})();