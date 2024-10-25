import express from "express"
import { takeNotes } from "./notes/index.js";


function main(){

  const app = express()
  const port = process.env.PORT || 8000;

  app.use(express.json());

  app.get('/',(_req, res)=>{
    res.status(200).send('ok good')
  })

  app.post('/take_notes',async (req,res) => {
    console.log("REQ",req,"Body",req.body)
    if(!req.body){
      res.status(200).send("Invalid Body")
    return;
    }
    const { pdfUrl,name,pdfsToDelete} = req.body

    const notes = await takeNotes(pdfUrl,name,pdfsToDelete)
    res.status(200).send(notes)
    return;

  })  

  app.listen(port,()=>{
    console.log(`LISTENIG port ${port}`)
  })
}

main()