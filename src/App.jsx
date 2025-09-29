import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css';
import axios from 'axios';
import MultiFileUpload from './MultiFileUpload';
import ReCAPTCHA from 'react-google-recaptcha';

const App = () => {

  const formRef = useRef();
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("")
  const [captchaValue, setCaptchaValue] = useState(null);


    const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0"); 
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
      const today = new Date();
    const [selectedDate, setSelectedDate] = useState(formatDate(today));
   const handleChange = (e) => {
    const rawValue = e.target.value; 
    setSelectedDate(formatDate(rawValue));
  };

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };


  const generatePDF = async () => {

    const form = formRef.current;
    const originalWidth = form.style.width;
    form.style.width = "1200px";

    const sections = Array.from(
      form.querySelectorAll(
        ".form-header, .highlight-bar, .doctor-select, .section-title, .patient-info, .referral-reasons, .teeth-section, .comments-section, .section-doc-uploading"
      )
    );

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    let currentHeight = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const canvas = await html2canvas(section, { scale: 1.2, useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 1);
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;


      if (currentHeight + imgHeight > pdfHeight) {
        pdf.addPage();
        currentHeight = 0;
      }

      pdf.addImage(imgData, "JPEG", 0, currentHeight, imgWidth, imgHeight);
      currentHeight += imgHeight;
    }


    form.style.width = originalWidth;

    return pdf.output("blob")
  };


 const handleSubmit = async () => {


  //  if (!captchaValue) {
  //     alert("Please verify the reCAPTCHA!");
  //     return;
  //   }
  setLoading(true);
  setErrors({});
  setGeneralError("");

  const newErrors = {};

  const patientName = document.querySelector("input[name='patientName']")?.value.trim();
  const phone = document.querySelector("input[name='phone']")?.value.trim();
  const email = document.querySelector("input[name='email']")?.value.trim();
  const refDoc = document.querySelector("input[name='ref-doctor']")?.value.trim();
  const refOffice = document.querySelector("input[name='ref-office']")?.value.trim();

  if (!patientName) newErrors.patientName = "Patient name is required";
  if (!phone) newErrors.phone = "Phone number is required";
  if (!email) newErrors.email = "Email is required";
  if (!refDoc) newErrors.refDoc = "Referring doctor is required";
  if (!refOffice) newErrors.refOffice = "Referring office is required";

  const phoneRegex = /^[0-9]{7,15}$/;
  if (phone && !phoneRegex.test(phone)) newErrors.phone = "Phone number must contain only digits (7-15 characters)";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) newErrors.email = "Please enter a valid email address";

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    setGeneralError("Please check the required fields above before submitting.");
    setLoading(false);
    return;
  }

  try {
    const pdfBlob = await generatePDF();

   
    const formData = new FormData();
    formData.append("name", patientName);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("pdf", pdfBlob, "doctor-form.pdf");

    files?.forEach((file) => formData.append("attachments", file, file.name));

    const doctor =
      document.querySelector(".doctor-select input:checked")?.nextSibling?.textContent.trim() || "";

    const callPatientForAppointment =
      document.querySelector(".patient-info input[type='checkbox']")?.checked || false;

    const reasonsData = Array.from(
      document.querySelectorAll(".referral-reasons input:checked")
    ).map((el) => el.parentElement.textContent.trim());
    const reasons = reasonsData.join(", ");

    const selectedTeeth = Array.from(
      document.querySelectorAll(".teeth-section input:checked")
    ).map((el) => el.nextSibling.textContent.trim());

    const rightSide = ['A', 'B', 'C', 'D', 'E', 'T', 'S', 'R', 'Q', 'P'];
    const leftSide = ['F', 'G', 'H', 'I', 'J', 'O', 'N', 'M', 'L', 'K'];

    const numbers = selectedTeeth.filter((t) => /^[0-9]+$/.test(t));
    const right = selectedTeeth.filter((t) => rightSide.includes(t));
    const left = selectedTeeth.filter((t) => leftSide.includes(t));

    const teethOrAreaToBeTreated = {
      numbers: numbers.join(" "),
      alphabets: {
        right: right.join(" "),
        left: left.join(" ")
      }
    };

    const comments =
      document.querySelector(".comments-section div[contenteditable]")?.innerText.trim() || "";

    const callBeforeTreatment =
      Array.from(document.querySelectorAll(".comments-section input[type='checkbox']"))[0]?.checked || false;

    const radiographsSent =
      Array.from(document.querySelectorAll(".comments-section input[type='checkbox']"))[1]?.checked || false;


    const jsonData = {
      doctor,
      patient: {
        name: patientName,
        phone,
        email,
        callPatientForAppointment: callPatientForAppointment ? "Yes" : "No"
      },
      referral: { doctor: refDoc, office: refOffice, date:formatDate(today)},
      reasonForReferral: reasons,
      teethOrAreaToBeTreated,
      comments,
      options: {
        callBeforeTreatment: callBeforeTreatment ? "Yes" : "No",
        radiographsSent: {
          sent: radiographsSent ? "Yes" : "No",
          dateTaken: selectedDate
        }
      },
    };


    const backendResponse = await axios.post(
      "https://crm-automation.medrebel.io/upload_pdf_webhook/L9XGANSmPqqpm8vIKVW9/",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    if (!(backendResponse?.status === 200 && backendResponse?.data?.media_url[0]?.url)) {
    setGeneralError("Backend webhook failed or did not return a valid PDF URL.");
    }

    const pdf = backendResponse.data.media_url[0].url;
    console.log("PDF uploaded:", pdf);
    setPdfUrl(pdf);

    
    const ghl_response = await axios.post(
      "https://services.leadconnectorhq.com/hooks/L9XGANSmPqqpm8vIKVW9/webhook-trigger/401f2e5d-26a9-4e6c-a7e0-881fac99a413",
      jsonData
    );
    console.log("GHL response:", ghl_response);

  } catch (error) {
    console.error("Form submission error:", error);
    setGeneralError("Failed to submit the form. Please try again.");
  } finally {
    setLoading(false);
  }
};



  return (
    <div ref={formRef} className="form-container">

      <div className="form-header">
        <div className="logo">
          <img
            src="https://cdn.prod.website-files.com/6894fa634b8920b095ef03a7/6899f2529c7b78c578fd184a_Stacked%20Carolina%20Logo%20White%20(2).avif"
            alt="Logo"
          />
        </div>
        <div className="info">
          <p>
            9920 Kincey Ave, Suite 280
            <br /> Huntersville, NC 28708
          </p>
          <p>
            (704) 332-3000
            <br /> info@carolinaimplants.com
            <br /> www.carolinaimplants.com
          </p>
        </div>
      </div>



      <div className="doctor-select">
        <label>
          <input type="checkbox" /> Any Doctor
        </label>
        <label>
          <input type="checkbox" /> Dr. Christopher Ricker, DMD, MS
        </label>
        <label>
          <input type="checkbox" /> Dr. Andrew Timmerman, DMD
        </label>
      </div>


      <div className="section-title">Patient Information</div>
      <div className="patient-info">
        <label>Patient Name*</label> <input name="patientName" type="text" required />
        {errors.patientName && <div className="error">{errors.patientName}</div>}
        <br />
        <label>Phone*</label> <input name="phone" type="tel" required />
        {errors.phone && <div className="error">{errors.phone}</div>}
        <br />
        <label>Email*</label> <input name="email" type="email" required />
        {errors.email && <div className="error">{errors.email}</div>}
        <br />
        <div className="checkbox-line">
          <label>
            <input type="checkbox" /> Please call patient to schedule appointment
          </label>
        </div>
        <label>Referring Doctor*</label> <input required type="text" name='ref-doctor' />
        {errors.refDoc && <div className="error">{errors.refDoc}</div>}
        <br />
        <label>Referring Office*</label> <input required type="text" name='ref-office' />
        {errors.refOffice && <div className="error">{errors.refOffice}</div>}
        <br />
        <label>Date:</label> <span>
          {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <br />
      </div>


      <div className="section-title">Reason for Referral</div>
      <div className="referral-reasons">
        {[
          'Consult/Diagnosis',
          'Periodontal Therapy',
          'Peri-Implantitis',
          'Dental Implants',
          'Gingival Recession',
          'Wisdom Teeth Extractions',
          'All-on-Four (Hybrid)',
          'Gum Grafting',
          'Exposure of Impacted Tooth',
          'Snap-in Overdenture',
          'Bone Graft/Sinus Lift',
          'Crown Lengthening',
          'Extractions/Site Preservation',
          'LANAP/LAPIP',
          'Pre-Ortho Eval',
        ].map((reason, i) => (
          <label key={i}>
            <input type="checkbox" /> {reason}
          </label>
        ))}
      </div>


      <div className="section-title">Please Mark Teeth or Area to be Treated</div>
      <div className="teeth-section">
        <div className="teeth-box full">
          {[...Array(16)].map((_, i) => (
            <label key={i}>
              <input type="checkbox" />
              <span>{i + 1}</span>
            </label>
          ))}
        </div>
        <div className="teeth-row primary-combined">
          <span className="side-label pd-r">Right</span>
          <div className="primary-wrapper">
            <div className="teeth-row">
              <div className="teeth-box half">
                {['A', 'B', 'C', 'D', 'E'].map((t) => (
                  <label key={t}>
                    <input type="checkbox" />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
              <div className="teeth-box half no-border-left">
                {['F', 'G', 'H', 'I', 'J'].map((t) => (
                  <label key={t}>
                    <input type="checkbox" />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="teeth-row">
              <div className="teeth-box half no-border">
                {['T', 'S', 'R', 'Q', 'P'].map((t) => (
                  <label key={t}>
                    <input type="checkbox" />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
              <div className="teeth-box half no-border no-border-left">
                {['O', 'N', 'M', 'L', 'K'].map((t) => (
                  <label key={t}>
                    <input type="checkbox" />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <span className="side-label pd-l">Left</span>
        </div>
        <div className="teeth-box full">
          {[...Array(16)].map((_, i) => (
            <label key={i}>
              <input type="checkbox" />
              <span>{32 - i}</span>
            </label>
          ))}
        </div>
      </div>



      <div className="section-title">Please add Attachments</div>
      <div className='section-doc-uploading'>

        <MultiFileUpload

          files={files}
          setFiles={setFiles}
          onFilesChange={(selectedFiles) => {
            console.log("Selected files:", selectedFiles);

          }}
        />
      </div>



      <div className="section-title">Working Diagnosis / Comments:</div>
      <div className="comments-section">
        <div
          contentEditable
          style={{
            minHeight: "100px",
            border: "1px solid #ccc",
            padding: "8px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        ></div>


        <label>
          <input type="checkbox" /> Please call me before proceeding with treatment
        </label>
        <label>
          <input type="checkbox" /> I have sent radiographs for your evaluation. Date taken:
       
           <input
        type="date"
        onChange={handleChange}
        style={{ padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }}
      />
        </label>
      </div>
            <ReCAPTCHA
        sitekey="6LfKF54rAAAAAEa7Baa_hBfQqcBblO1SKOKNzgjN" 
        onChange={handleCaptchaChange}
      />
      <div style={{ textAlign: "center", width: "100%", marginBottom: "2rem" }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: loading ? '#555' : '#253238',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            fontSize: '20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s',
          }}
        >
          {loading ? "Submitting..." : "Submit Your Application"}
        </button>
        {loading && <div className="loader"></div>}
        {generalError && <div className="error general-error">{generalError}</div>}
      </div>


      {pdfUrl && (
        <div style={{ marginBottom: "2rem", marginTop: "1rem", textAlign: "center" }}>
          Your PDF is ready to download:{" "}
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            Click Here
          </a>
        </div>
      )}

    </div>
  );
};

export default App;
