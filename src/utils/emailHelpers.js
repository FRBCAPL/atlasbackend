import emailjs from "emailjs-com";
import { format, parseISO } from "date-fns";

export async function sendProposalEmail({ to_email, to_name, from_name, day, date, time, location, message }) {
  const formattedDate = format(parseISO(date), "MM-dd-yyyy");
  try {
    await emailjs.send(
      'service_l5q2047',
      'template_xu0tl3i',
      {
        to_email,
        to_name,
        from_name,
        day,
        date: formattedDate,
        time,
        location,
        message,
      },
      'g6vqrOs_Jb6LL1VCZ'
    );
    // Replace alert with your app's notification system
    alert('Proposal email sent!');
  } catch (err) {
    alert('Failed to send proposal email.');
  }
}
