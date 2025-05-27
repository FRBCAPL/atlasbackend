// src/utils/emailHelpers.js
import emailjs from "emailjs-com";
import { format, parseISO } from "date-fns";

export function sendProposalEmail({ to_email, to_name, from_name, day, date, time, location, message }) {
  // Format date as MM-dd-yyyy
  const formattedDate = format(parseISO(date), "MM-dd-yyyy");

  emailjs
    .send(
      'service_l5q2047',
      'template_xu0tl3i',
      {
        to_email,
        to_name,
        from_name,
        day,
        date: formattedDate, // Use formatted date!
        time,
        location,
        message,
      },
      'g6vqrOs_Jb6LL1VCZ'
    )
    .then(
      () => {
        alert('Proposal email sent!');
      },
      () => {
        alert('Failed to send proposal email.');
      }
    );
}
