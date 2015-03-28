package Actors

import akka.actor._
import akka.contrib.pattern.DistributedPubSubExtension
import akka.contrib.pattern.DistributedPubSubMediator
import helper._
import play.api.Play.current
import play.api.libs.concurrent.Akka
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json.{Json, JsValue, Writes}
import play.api.libs.functional.syntax._


case class GetCollection(uri: String)
case class GetCollectionResponse(actor: ActorRef)

class CollectionSupervisor extends Actor
{
  def receive = {
    case GetCollection(uri) =>
      sender ! GetCollectionResponse(getOrCreateChild(uri))
  }

  private def getOrCreateChild(uri: String) = {
    val name = ActorHelper.normalizeName(uri)
    context.child(name) getOrElse (context.actorOf(CollectionActor.props(name), name = name))
  }
}

/**
 *
 */
object CollectionSupervisor
{
  lazy val mediator = DistributedPubSubExtension.get(Akka.system).mediator

  def subscribe(subscriber: ActorRef, path: String): Unit =
    mediator ! DistributedPubSubMediator.Subscribe(path, subscriber)

  def subscribe(subscriber: ActorRef, paths: Iterable[String]): Unit =
    paths.foreach { x => subscribe(subscriber, x) }

  def unsubscribe(subscriber: ActorRef, path: String): Unit =
    mediator ! DistributedPubSubMediator.Unsubscribe(path, subscriber)

  def unsubscribe(subscriber: ActorRef, paths: Iterable[String]): Unit =
    paths.foreach { x => unsubscribe(subscriber, x) }

  def updateStatus(path: String, status: models.Status) =
    mediator ! DistributedPubSubMediator.Publish(path, StatusUpdate(path, status))
}